const User = require('../models/user_model'); // Adjust path to your User model
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');






exports.registerUser = async (req, res) => {
    const { email, password, confirmPassword, phone, name, role } = req.body;
    try {
        const validMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!validMail) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid email format" });
        }
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res
                .status(400)
                .json({ success: false, message: "email already exists" });
        }
        const validPhone = /^\d{10}$/.test(phone);
        if (!validPhone) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid phone number format" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords and Confirm Password do not match",
            });
        }
        if (role !== "user" && role !== "admin") {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }
        const passwordStrengthRegex =
            /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/.test(password);
        console.log(passwordStrengthRegex);
        if (!passwordStrengthRegex) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters long, include a number, an uppercase letter, and a special character.",
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);


        const newUser = new User({
            email,
            password: hashedPassword,
            phone,
            displayName: name,
            role,

        });

        const savedUser = await newUser.save();
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: savedUser,
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.loginUser = async (req, res) => {

    const { email, password } = req.body;

    try {
        if (email == undefined || email == "" || email == null) {
            return res
                .status(400)
                .json({ success: false, message: "email cannot be empty " });
        }

        const validMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!validMail) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid email format" });
        }
        if (password == undefined || password == "" || password == null) {
            return res
                .status(400)
                .json({ success: false, message: "password cannot be empty " });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Account with this email does not exist",
            });
        }
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid credentials" });
        }
        if (user.blockUser) {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked",
            });
        }
        const accessToken = jwt.sign(
            { username: user.email, role: user.role, id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        user.accessToken = accessToken;
        const refreshToken = jwt.sign(
            { username: user.email, role: user.role, id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        user.refreshToken = refreshToken;
        await user.save();
        const expiryTime = Date.now() + 3600 * 1000;
        const expiryDate = new Date(expiryTime);
        res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            refreshToken,
            user: user,
            kyc_status: user.role === "user" ? user.kyc_status : null,
            expiresIn: expiryDate,
        });


    } catch (error) {
        console.error("error", error);
        res
            .status(500)
            .json({ success: false, message: "Login failed", error: error.message });
    }
};

exports.logoutUser = async (req, res) => {
    try {
        const { email } = req.body;
        const validMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!validMail) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid email format" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Account with this email does not exist",
            });
        }
        user.refreshToken = undefined;
        user.accessToken = undefined;

        await user.save();
        res.status(200).json({ success: true, message: "Logout successful" });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error logging out",
            error: error.message,
        });
    }
};

exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res
            .status(405)
            .json({ success: false, message: "No refresh token provided" });
    }

    try {
        const user = await User.findOne({ refreshToken });
        if (!user) {
            return res
                .status(405)
                .json({ success: false, message: "Invalid refresh token" });
        }
        jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                user.deviceId = null;
                user.refreshToken = null;
                user.save();
                return res.status(405).json({
                    success: false,
                    message: "Refresh token is expired or invalid",
                });
            }

            const newAccessToken = jwt.sign(
                { username: user.email, role: user.role, id: user._id },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );
            res.status(200).json({ success: true, accessToken: newAccessToken });
        });
    } catch (error) {
        console.error("error", error);
        res.status(500).json({
            success: false,
            message: "Error refreshing token",
            error: error.message,
        });
    }
};


exports.getAllUsers = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const users = await User.find().select('-password -__v');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


exports.getUserById = async (req, res) => {
    try {
        // Allow admin or the user themselves to access
        if (!req.params.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const user = await User.findById(req.params.id).select('-password -__v');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).send('Server Error');
    }
};
exports.updateUser = async (req, res) => {
    try {
        if (req.user.role == 'admin' && req.params.id) {
            return res.status(404).json({ success: false, message: 'UseriId is required' });
        } else if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.email !== req.body.email) {
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                return res
                    .status(400)
                    .json({ success: false, message: "email already exists" });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.json(updatedUser);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).send('Server Error');
    }
};

exports.deleteUser = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const deletedUser = await User.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'User removed' , user: deletedUser });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).send('Server Error');
    }
};
exports.blockOrUnblockUser = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.blockUser = !user.blockUser; // Toggle block status
        if (user.blockUser) {
            user.refreshToken = null; 
        }
        await user.save();

        res.json({
            success: true,
            message: user.blockUser ? 'User blocked successfully' : 'User unblocked successfully',
            user,
        });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).send('Server Error');
    }
};

