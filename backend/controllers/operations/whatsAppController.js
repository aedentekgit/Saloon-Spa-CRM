const WhatsAppCampaign = require('../../models/operations/WhatsAppCampaign');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch, toObjectIdIfValid } = require('../../utils/branch');

// @desc    Get all campaigns
// @route   GET /api/whatsapp
// @access  Private
const getCampaigns = async (req, res) => {
  try {
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;
    const query = {};

    if (req.user.role === 'Admin') {
      if (requestedBranch) query.branch = toObjectIdIfValid(requestedBranch);
    } else {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      if (requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: Cannot view campaigns for another branch.' });
      }
      query.branch = toObjectIdIfValid(userBranchId);
    }

    const { data, pagination } = await paginateModelQuery(WhatsAppCampaign, query, req, {
      populate: 'branch',
      sort: { createdAt: -1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Log & Send new campaign
// @route   POST /api/whatsapp
// @access  Private
const createCampaign = async (req, res) => {
  const { templateName, audience, message, branch } = req.body;

  try {
    const User = require('../../models/core/User');
    const sendWhatsApp = require('../../utils/sendWhatsApp');
    const Notification = require('../../models/core/Notification');
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = getBranchId(branch) || userBranchId;

    if (req.user.role !== 'Admin' && !sameBranch(requestedBranch, userBranchId)) {
      return res.status(403).json({ message: 'Access Denied: Cannot create campaigns for another branch.' });
    }

    // 1. Fetch target audience
    let query = { role: 'Client', status: 'Active' };
    if (requestedBranch) {
      query.branch = toObjectIdIfValid(requestedBranch);
    }
    if (audience === 'Active Only') query.status = 'Active';
    // Add more audience logic here as needed

    const recipients = await User.find(query);

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No recipients found for the selected audience' });
    }

    // 2. Create the campaign record first as 'Sending'
    const campaign = await WhatsAppCampaign.create({
      user: req.user._id,
      templateName,
      audience,
      message,
      sentCount: recipients.length,
      status: 'Sending',
      date: new Date(),
      branch: requestedBranch ? toObjectIdIfValid(requestedBranch) : undefined
    });

    // 3. Dispatch messages asynchronously (Non-blocking response)
    // We process in background so user doesn't wait
    process.nextTick(async () => {
      let successCount = 0;
      for (const client of recipients) {
        if (!client.phone) continue;

        // Personalize message
        const personalized = message.replace(/\[Name\]/g, client.name || 'Valued Guest');

        const result = await sendWhatsApp(client.phone, personalized);
        if (result.success) successCount++;
      }

      // 4. Update campaign status
      campaign.status = 'Completed';
      campaign.sentCount = successCount;
      await campaign.save();

      // 5. Notify admin that campaign is finished
      await Notification.create({
        recipient: req.user._id,
        title: 'Campaign Completed',
        message: `WhatsApp campaign '${templateName}' finished. Sent to ${successCount} clients.`,
        type: 'system',
        link: '/whatsapp'
      });
    });

    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getCampaigns,
  createCampaign
};
