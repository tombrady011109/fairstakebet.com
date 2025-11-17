const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Campaign = require('../models/campaign.model'); // Import Campaign model
const sendEmail = require('../services/emailService');
const { generateVerificationCode } = require('../utils/utils');
const crypto = require('crypto');

// JWT secret key (replace with your actual secret)
const JWT_SECRET = 'valiantjoeauth'; // Replace with your actual JWT secret

// Generate a unique affiliate code
const generateAffiliateCode = () => {
  // Generate a random string of 8 characters (alphanumeric)
  return crypto.randomBytes(4).toString('hex');
};

// User login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    // Return user data and token
    res.status(200).json({
      user,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// User registration
const register = async (req, res) => {
  const data  = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data?.password, 10);

    // Generate a 6-digit verification code
    const verificationCode = generateVerificationCode();

    // Set expiration time for the verification code (10 minutes from now)
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Generate a unique affiliate code for this user
    const affiliateCode = generateAffiliateCode();

    // Check if a referral code was provided and is valid
    let referrer = null;
    if (data?.referralCode) {
      referrer = await User.findOne({ 
        $or: [
          { affiliateCode: data?.referralCode },
          { username: data?.referralCode }
        ]
      });
    }

        // Send a welcome email with the verification code
    // const emailTemplate = `
    //   <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    //     <h2 style="color: #4CAF50;">Welcome to Fairstakebet Casino, ${data?.username}!</h2>
    //     <p>Thank you for registering with us. To complete your registration, please verify your account using the code below:</p>
    //     <div style="font-size: 24px; font-weight: bold; color: #4CAF50; margin: 20px 0;">${verificationCode}</div>
    //     <p>This code will expire in 10 minutes.</p>
    //     <p>If you did not register for this account, please ignore this email.</p>
    //     <p>Best regards,<br>The Fairstakebet Casino Team</p>
    //   </div>
    // `;

    // await sendEmail(data?.email, 'Welcome to Fairstakebet Casino - Verify Your Account', emailTemplate);

    // Create new user with all form data
    const newUser = new User({
      email: data.email,
      password: hashedPassword,
      username: data.username,
      language: data?.language || 'English',
      firstName: data.firstName,
      lastName: data.lastName,
      country: data.country,
      state: data.state,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      residentAddress: data.residentAddress, // Store the address from the form
      city: data.city,
      postalCode: data.postalCode,
      verificationCode,
      verificationCodeExpires,
      is_verified: false, // Mark as unverified initially
      affiliateCode, // Add the generated affiliate code
      referredBy: referrer ? referrer._id : null, // Store referrer's ID if available
      referralCampaign: data.campaignCode || null, // Store campaign code if provided
      referralCount: 0, // Initialize referral count
      agreeToTerms: data.agreeToTerms || false
    });

    await newUser.save();

    // If user was referred, increment the referrer's referral count
    if (referrer) {
      referrer.referralCount = (referrer.referralCount || 0) + 1;
      
      // Add this user to the referrer's referrals array if it exists in the model
      if (referrer.referrals) {
        referrer.referrals.push(newUser._id);
      } else {
        referrer.referrals = [newUser._id];
      }
      
      await referrer.save();
      
      // If a campaign code was provided, update the campaign's referral count
      if (data.campaignCode) {
        await Campaign.findOneAndUpdate(
          { code: data.campaignCode, userId: referrer._id },
          { $inc: { referralCount: 1 } }
        );
      }
    }



    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '1d' });

    // Return user data and token
    res.status(201).json({
      user:newUser,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Check for MongoDB quota error
    if (error.message && (error.message.includes('space quota') || error.message.includes('AtlasError') || error.code === 8000)) {
      return res.status(507).json({ 
        message: 'Database storage limit reached. Please contact support.', 
        error: 'Storage quota exceeded' 
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify account
const verifyAccount = async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the verification code matches
    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Check if the verification code has expired
    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    // Create and send a thank you email
    const thankYouTemplate = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Thank You for Verifying Your Email!</h2>
        <p>Dear ${user.username},</p>
        <p>We appreciate you taking the time to verify your email address. Your account is now fully activated.</p>
        <p>You can now enjoy all the features of Fairstakebet Casino.</p>
        <p>Remember, your affiliate code is: <strong>${user.affiliateCode}</strong>. Share it with friends to earn commissions!</p>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The Fairstakebet Casino Team</p>
      </div>
    `;

    await sendEmail(user.email, 'Thank You for Verifying Your Account', thankYouTemplate);

    // Mark the user as verified
    user.is_verified = true;
    user.verificationCode = null; // Clear the verification code
    user.verificationCodeExpires = null; // Clear the expiration time
    await user.save();

    res.status(200).json({ success: true, message: 'Account verified successfully' });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newCode = generateVerificationCode();
    user.verificationCode = newCode;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    const emailTemplate = `
      <p>Your new verification code is: <strong>${newCode}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>Your affiliate code is: <strong>${user.affiliateCode}</strong></p>
    `;

    await sendEmail(email, 'Resend Verification Code', emailTemplate);

    res.status(200).json({ success: true, message: 'Verification code resent successfully.' });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Fetch user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming `req.user` is populated by middleware
    const user = await User.findById(userId).select('-password'); // Exclude password from response

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's referrals
const getUserReferrals = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find users who were referred by this user
    const referrals = await User.find({ referredBy: userId })
      .select('username email createdAt is_verified')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      referralCount: referrals.length,
      referrals
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { 
  login, 
  register, 
  verifyAccount, 
  resendVerificationCode, 
  getUserProfile,
  getUserReferrals
};