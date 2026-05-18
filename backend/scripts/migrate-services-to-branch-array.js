require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/operations/Service');
const connectDB = require('../config/db');

const getBranchId = (branch) => {
  if (!branch) return '';
  if (typeof branch === 'object' && branch._id) return branch._id.toString();
  return branch.toString();
};

const run = async () => {
  await connectDB();

  try {
    await Service.collection.dropIndex('name_1_branch_1');
    console.log('Dropped legacy unique index: name_1_branch_1');
  } catch (error) {
    if (error?.codeName !== 'IndexNotFound') {
      console.warn(`Could not drop legacy index name_1_branch_1: ${error.message}`);
    }
  }

  const services = await Service.find({}).sort({ createdAt: 1 });
  const groups = new Map();

  services.forEach((service) => {
    const key = service.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(service);
  });

  let mergedGroups = 0;
  let deletedDocs = 0;

  for (const [, group] of groups) {
    if (group.length === 0) continue;

    const primary = group.find(service => Array.isArray(service.branches) && service.branches.length > 0) || group[0];
    const branchMap = new Map();

    group.forEach((service) => {
      if (Array.isArray(service.branches) && service.branches.length > 0) {
        service.branches.forEach((entry) => {
          const branchId = getBranchId(entry.branch);
          if (!branchId || branchMap.has(branchId)) return;
          branchMap.set(branchId, {
            branch: entry.branch,
            status: entry.status || service.status || 'Active',
            commissionType: entry.commissionType || service.commissionType || 'Percentage',
            commissionValue: entry.commissionValue ?? service.commissionValue ?? 10,
            inventoryUsage: entry.inventoryUsage?.length ? entry.inventoryUsage : (service.inventoryUsage || [])
          });
        });
        return;
      }

      const branchId = getBranchId(service.branch);
      if (!branchId || branchMap.has(branchId)) return;
      branchMap.set(branchId, {
        branch: service.branch,
        status: service.status || 'Active',
        commissionType: service.commissionType || 'Percentage',
        commissionValue: service.commissionValue ?? 10,
        inventoryUsage: service.inventoryUsage || []
      });
    });

    if (branchMap.size === 0) continue;

    primary.name = primary.name || group[0].name;
    primary.duration = primary.duration || group[0].duration || 60;
    primary.price = primary.price || group[0].price || 0;
    primary.category = primary.category || group[0].category;
    primary.description = primary.description || group[0].description;
    primary.image = primary.image || group.find(service => service.image)?.image;
    primary.branches = Array.from(branchMap.values());

    primary.branch = undefined;
    primary.status = undefined;
    primary.commissionType = undefined;
    primary.commissionValue = undefined;
    primary.inventoryUsage = undefined;
    await primary.save();

    const duplicateIds = group
      .filter(service => service._id.toString() !== primary._id.toString())
      .map(service => service._id);

    if (duplicateIds.length > 0) {
      await Service.deleteMany({ _id: { $in: duplicateIds } });
      deletedDocs += duplicateIds.length;
      mergedGroups += 1;
    }
  }

  console.log(`Merged service groups: ${mergedGroups}`);
  console.log(`Deleted duplicate service documents: ${deletedDocs}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
