const authRoute = require('./auth.route');
const userRoute = require("./api/user.route")
const ccpayment = require("./api/ccpayment.route")
const affiliateRoutes = require('./api/affiliate.routes');
const CrashGameRoute = require('./games/crash.routes');
const PlinkoGameRoute = require('./api/games/plinko.route');
const adminRoute = require('./admin.route');
const vipRoutes = require('./api/vip.route');

const routeManager = (app) => {
    // API Routes
    app.use("/auth", authRoute);
    app.use("/api/user", userRoute)
    app.use("/api/ccpayment", ccpayment)
    app.use("/api/crash", CrashGameRoute);
    app.use("/api/plinko", PlinkoGameRoute);
    app.use('/api/affiliate', affiliateRoutes);
    // Add this with your other route imports
    app.use('/api/vip', vipRoutes);
    app.use('/admin', adminRoute);
}

module.exports = routeManager
