const fs = require('fs');
const path = require('path');

const middlewareDir = path.join(__dirname, '../backend/middleware');
if (!fs.existsSync(middlewareDir)) fs.mkdirSync(middlewareDir, { recursive: true });

const middlewareCode = `
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
`;

fs.writeFileSync(path.join(middlewareDir, 'paginationMiddleware.js'), middlewareCode.trim());

const serverPath = path.join(__dirname, '../backend/server.js');
let serverCode = fs.readFileSync(serverPath, 'utf8');

if (!serverCode.includes('paginationMiddleware')) {
  serverCode = serverCode.replace(
    "const errorHandler = require('./middleware/errorMiddleware');",
    "const errorHandler = require('./middleware/errorMiddleware');\nconst paginationMiddleware = require('./middleware/paginationMiddleware');"
  );
  
  if (serverCode.includes('app.use(express.json());')) {
    serverCode = serverCode.replace(
      'app.use(express.json());',
      'app.use(express.json());\napp.use(paginationMiddleware);'
    );
  }
  
  fs.writeFileSync(serverPath, serverCode);
  console.log("Backend pagination middleware injected!");
} else {
  console.log("Backend pagination middleware already exists.");
}

