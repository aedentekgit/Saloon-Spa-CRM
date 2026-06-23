module.exports = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(body) {
    if (Array.isArray(body) && req.query.page) {
       const page = parseInt(req.query.page, 10) || 1;
       const limit = parseInt(req.query.limit, 10) || 10;
       const total = body.length;
       const pages = Math.ceil(total / limit) || 1;
       const skip = (page - 1) * limit;
       
       const paginatedData = body.slice(skip, skip + limit);
       
       return originalJson.call(this, {
         data: paginatedData,
         pagination: { total, page, pages, limit }
       });
    }
    return originalJson.call(this, body);
  };
  next();
};
