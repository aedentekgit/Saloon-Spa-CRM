const DEFAULT_LIMIT = 10;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPaginationOptions = (req, defaultLimit = DEFAULT_LIMIT) => {
  const paginate = req.query.page !== undefined || req.query.limit !== undefined;
  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, defaultLimit);
  const skip = (page - 1) * limit;

  return { paginate, page, limit, skip };
};

const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  pages: Math.max(1, Math.ceil(total / limit)),
  limit
});

const applyQueryOptions = (query, { populate, sort, select, lean } = {}) => {
  if (populate) {
    const populateEntries = Array.isArray(populate) ? populate : [populate];
    populateEntries.forEach(entry => query.populate(entry));
  }

  if (sort) query.sort(sort);
  if (select) query.select(select);
  if (lean) query.lean();

  return query;
};

const paginateModelQuery = async (Model, filter, req, options = {}) => {
  const { paginate, page, limit, skip } = getPaginationOptions(req, options.defaultLimit);
  const query = applyQueryOptions(Model.find(filter), options);

  if (!paginate) {
    const data = await query;
    return { data, pagination: null };
  }

  const total = await Model.countDocuments(filter);
  const data = await query.skip(skip).limit(limit);

  return {
    data,
    pagination: buildPaginationMeta(total, page, limit)
  };
};

module.exports = {
  DEFAULT_LIMIT,
  getPaginationOptions,
  buildPaginationMeta,
  applyQueryOptions,
  paginateModelQuery
};
