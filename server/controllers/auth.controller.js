import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      res.status(400);
      throw new Error('Please provide username and password');
    }

    const user = await User.findOne({ username });

    if (user && (await user.comparePassword(password))) {
      if (role && user.role !== role) {
        res.status(401);
        throw new Error('Selected role does not match user account role');
      }

      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid username or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Private/Admin
export const register = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      res.status(400);
      throw new Error('Please fill in all fields');
    }

    const userExists = await User.findOne({ username });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      username,
      password,
      role,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users list
// @route   GET /api/v1/auth/users
// @access  Private/Admin, Business Owner
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    next(error);
  }
};
