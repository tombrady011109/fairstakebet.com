const jwt = require('jsonwebtoken');
const Profile = require('../models/user.model');
const PublicModel = require('../models/chat.model');
const DiceGame = require('../models/games/classic-dice/dice_game');
const CrashGame = require('../models/games/crash/crashbet');
const CrashGameEl = require('../models/games/crash/crashgame');
const HiloGame = require('../models/games/hilo/hilo_game');
const PlinkoGame = require('../models/games/plinko/plinko_gameV2');
const CCPaymentDeposit = require('../models/ccpayment-deposit');
const CCPaymentWithdrawal = require('../models/ccpayment-withdrawal');

const ADMIN_EMAIL = 'admin@fairstakebet.com';
const ADMIN_PASSWORD = 'Keys2541?';
const JWT_SECRET = 'InenwiNIWb39Nneol?s.(3n)';

const adminController = {
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
                return res.status(401).json({
                    success: false,
                    message: 'Incorrect email or password'
                });
            }

            // Create token that expires in 7 days
            const token = jwt.sign(
                { role: 'admin', email: ADMIN_EMAIL },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(200).json({
                success: true,
                data: {
                    token,
                    email: ADMIN_EMAIL,
                    role: 'admin'
                }
            });

        } catch (error) {
            console.error('Admin login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    getUsers: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const skip = (page - 1) * limit;

            const users = await Profile.find()
                .sort({ createdAt: -1 }) // Newest first
                .skip(skip)
                .limit(limit)
                .select('user_id username email current_level is_verified status createdAt');


            const total = await Profile.countDocuments();

            res.status(200).json({
                success: true,
                data: {
                    users,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page,
                    total
                }
            });

        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    updateUserStatus: async (req, res) => {
        try {
            const { userId } = req.params;
            const { status } = req.body;

            if (!['active', 'disabled'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status value'
                });
            }

            const user = await Profile.findOneAndUpdate(
                { user_id: userId },
                { status },
                { new: true }
            );

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                data: user
            });

        } catch (error) {
            console.error('Update user status error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    getUserDetails: async (req, res) => {
        try {
            const { userId } = req.params;
            // Fetch all data in parallel for better performance
            const [
                profile,
                publicData,
                diceGames,
                crashGames,
                hiloGames,
                plinkoGames,
                deposits,
                withdrawals,
                wallet
            ] = await Promise.all([
                // Profile data
                Profile.findById(userId),
                
                // Public data (chats)
                PublicModel.find({ userId }),
                
                // Games data
                DiceGame.countDocuments({ user_id: userId }),
                CrashGame.countDocuments({ user_id: userId }),
                HiloGame.countDocuments({ user_id: userId }),
                PlinkoGame.countDocuments({ user_id: userId }),
                
                // Financial data
                CCPaymentDeposit.aggregate([
                    { $match: { user_id: userId, status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]),
                
                CCPaymentWithdrawal.aggregate([
                    { $match: { user_id: userId, status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]),
                
               Profile.findById(userId)
            ]);

            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const totalDeposits = deposits[0]?.total || 0;
            const totalWithdrawals = withdrawals[0]?.total || 0;

            const response = {
                // Profile Model Data
                user_id: profile._id,
                username: profile.username,
                email: profile.email,
                profileImg: profile.profileImg || 'default-avatar-url',
                current_level: profile.current_level,
                next_level: profile.next_level,
                level: profile.level,
                referral_code: profile.referral_code,
                emailIsVerified: profile.emailIsVerified,
                emailIsLinked: profile.emailIsLinked,
                profileIsHidden: profile.profileIsHidden,
                is_verified: profile.is_verified,
                status: profile.status || "active",
                created_at: profile.createdAt,

                // Public Model Data
                total_chats: publicData?.length || 0,

                // Games Models Data
                total_bets: diceGames + crashGames + hiloGames + plinkoGames,
                games_breakdown: {
                    dice_bets: diceGames,
                    crash_bets: crashGames,
                    hilo_bets: hiloGames,
                    plinko_bets: plinkoGames
                },

                // CCPayment Models Data
                total_deposits: totalDeposits,
                total_withdrawals: totalWithdrawals,

                // Dollar Wallet Model
                current_balance: wallet?.balance || 0
            };

            res.status(200).json({
                success: true,
                data: response
            });

        } catch (error) {
            console.error('Get user details error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    updateUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const updateData = req.body;

            // Update Profile collection
            const updatedProfile = await Profile.findOneAndUpdate(
                { user_id: userId },
                {
                    username: updateData.username,
                    email: updateData.email,
                    current_level: updateData.current_level,
                    next_level: updateData.next_level,
                    level: updateData.level,
                    referral_code: updateData.referral_code,
                    emailIsVerified: updateData.emailIsVerified,
                    emailIsLinked: updateData.emailIsLinked,
                    profileIsHidden: updateData.profileIsHidden,
                    is_verified: updateData.is_verified,
                    status: updateData.status
                },
                { new: true }
            );

            if (!updatedProfile) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Update UserAuth collection for relevant fields
            await Profile.findOneAndUpdate(
                { user_id: userId },
                {
                    username: updateData.username,
                    email: updateData.email
                }
            );

            res.status(200).json({
                success: true,
                data: updatedProfile
            });

        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Fetch all required data in parallel for better performance
        const [
            totalUsers,
            newUsersThisMonth,
            newUsersPrevMonth,
            totalDeposits,
            depositsThisMonth,
            depositsPrevMonth
        ] = await Promise.all([
            // Total registered users
            Profile.countDocuments(),
            
            // New users this month
            Profile.countDocuments({
                created_at: { $gte: firstDayOfMonth }
            }),
            
            // New users previous month
            Profile.countDocuments({
                created_at: {
                    $gte: firstDayOfPrevMonth,
                    $lt: firstDayOfMonth
                }
            }),
            
            // Total deposits all time
            CCPaymentDeposit.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            
            // Deposits this month
            CCPaymentDeposit.aggregate([
                {
                    $match: {
                        status: 'completed',
                        created_at: { $gte: firstDayOfMonth }
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            
            // Deposits previous month
            CCPaymentDeposit.aggregate([
                {
                    $match: {
                        status: 'completed',
                        created_at: {
                            $gte: firstDayOfPrevMonth,
                            $lt: firstDayOfMonth
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        // Calculate percentage changes
        const userGrowth = calculatePercentageChange(
            newUsersThisMonth,
            newUsersPrevMonth
        );

        const depositGrowth = calculatePercentageChange(
            depositsThisMonth[0]?.total || 0,
            depositsPrevMonth[0]?.total || 0
        );

        res.status(200).json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    newThisMonth: newUsersThisMonth,
                    growth: userGrowth
                },
                deposits: {
                    total: totalDeposits[0]?.total || 0,
                    thisMonth: depositsThisMonth[0]?.total || 0,
                    growth: depositGrowth
                },
                // ... other stats ...
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Helper function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

// Helper function to calculate GGR
const calculateGGR = async (startDate, endDate) => {
    // GGR calculation logic based on your business rules
    // This is a placeholder - implement according to your specific needs
    const [diceGGR, crashGGR, hiloGGR, plinkoGGR] = await Promise.all([
        DiceGame.aggregate([
            {
                $match: {
                    created_at: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$house_edge' }
                }
            }
        ]),
        CrashGame.aggregate([
            {
                $match: {
                    created_at: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$house_edge' }
                }
            }
        ]),
        HiloGame.aggregate([
            {
                $match: {
                    created_at: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$house_edge' }
                }
            }
        ]),
        PlinkoGame.aggregate([
            {
                $match: {
                    created_at: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$house_edge' }
                }
            }
        ])
    ]);

    return (
        (diceGGR[0]?.total || 0) +
        (crashGGR[0]?.total || 0) +
        (hiloGGR[0]?.total || 0) +
        (plinkoGGR[0]?.total || 0)
    );
};

// Add this new function to get GGR data over time
const getGGROverTime = async (days = 30) => {
    const now = new Date();
    const startDate = new Date(now.setDate(now.getDate() - days));
    
    const dailyGGR = await Promise.all([
        DiceGame.aggregate([
            {
                $match: {
                    created_at: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { 
                        year: { $year: "$created_at" },
                        month: { $month: "$created_at" },
                        day: { $dayOfMonth: "$created_at" }
                    },
                    total: { $sum: "$house_edge" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]),
        CrashGame.aggregate([
            {
                $match: {
                    created_at: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { 
                        year: { $year: "$created_at" },
                        month: { $month: "$created_at" },
                        day: { $dayOfMonth: "$created_at" }
                    },
                    total: { $sum: "$house_edge" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]),
        HiloGame.aggregate([
            {
                $match: {
                    created_at: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { 
                        year: { $year: "$created_at" },
                        month: { $month: "$created_at" },
                        day: { $dayOfMonth: "$created_at" }
                    },
                    total: { $sum: "$house_edge" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ])
    ]);

    // Combine all game data
    const combinedData = new Map();
    
    [...Array(days)].forEach((_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - index);
        const dateStr = date.toISOString().split('T')[0];
        combinedData.set(dateStr, 0);
    });

    dailyGGR.flat().forEach(item => {
        const date = new Date(item._id.year, item._id.month - 1, item._id.day);
        const dateStr = date.toISOString().split('T')[0];
        if (combinedData.has(dateStr)) {
            combinedData.set(dateStr, combinedData.get(dateStr) + item.total);
        }
    });

    return Array.from(combinedData.entries()).map(([date, value]) => ({
        date,
        value
    })).reverse();
};

const getHighestWins = async (req, res) => {
  try {
    // Get recent wins from all games
    const [crashWins, diceWins, hiloWins, plinkoWins] = await Promise.all([
        CrashGame.find({ won: true })
        .sort({ win_amount: -1 })
        .limit(20)
        .lean(),
        DiceGame.find({ has_won: true })
        .sort({ win_amount: -1 })
        .limit(20)
        .lean(),
        HiloGame.find({ won: true })
        .sort({ win_amount: -1 })
        .limit(20)
        .lean(),
        PlinkoGame.find({ won: true })
        .sort({ win_amount: -1 })
        .limit(20)
        .lean(),

    ]);
    // Normalize the data structure
    const formatWin =  (win, game) => ({
      game,
      betId: win.bet_id,
      userId: win.user_id,
      player:  'Anonymous',
      payout: win.payout,
      winAmount: win.profit,
      timestamp: win.created_at || win.time
    });


    // Combine and format all wins
    const allWins =  [
      ...crashWins.map(win => formatWin(win, 'Crash')),
      ...diceWins.map(win => formatWin(win, 'Dice')),
      ...hiloWins.map(win => formatWin(win, 'Hilo')),
      ...plinkoWins.map(win => formatWin(win, 'Plinko')),
    ];

    // Sort by win amount and get top 7
    const topWins =  allWins
      .sort((a, b) => b.winAmount - a.winAmount)
      .slice(0, 7);

    res.status(200).json({
      success: true,
      wins: topWins
    });
  } catch (error) {
    console.error('Error fetching highest wins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch highest wins'
    });
  }
};

module.exports = {
    getDashboardStats,
    ...adminController,
    getHighestWins
};

