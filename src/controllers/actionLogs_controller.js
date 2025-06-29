const ActionLog = require('../models/actionLogs_model');
const User = require('../models/user_model');
const mongoose = require('mongoose');
const Project = require('../models/project_model');

exports.createActionLog = async (req, res) => {
    try {
        const actionLog = new ActionLog(req.body);
        const { apiKey, projectId } = req.body;
        if (!apiKey || !projectId) {
            return res.status(400).json({
                success: false,
                message: 'API key and project ID are required'
            });
        }
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }
        if (project.apiKeys !== apiKey) {
            return res.status(403).json({
                success: false,
                message: 'Invalid API key for this project'
            });
        }
        if (project.blocked) {
            return res.status(403).json({
                success: false,
                message: 'Project is blocked and cannot log actions'
            });
        }
        if (project.isDeleted) {
            return res.status(403).json({
                success: false,
                message: 'Project is deleted and cannot log actions'
            });
        }
        await actionLog.save();
        res.status(201).json({
            success: true,
            message: 'Action log created successfully',
            actionLog
        });
    } catch (error) {
        console.error('Error creating action log:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create action log',
            error: error.message
        });
    }
}

exports.getActionLogs = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admins only.'
            });
        }
        let query = {};

        if (user.role == 'user') {
            query = {
                $or: [
                    { createdBy: req.user.id },
                    {
                        'teamMembers.user': req.user.id,

                    }
                ],
                isDeleted: false,
                blocked: false
            }; // Filter by user ID if not admin
        }
        if (user.role == 'admin') {
            query = {};
        }
        const FoundProject = await Project.find(query);
        const projectIds = FoundProject.map(project => project._id);
        query = { projectId: { $in: projectIds } };
        const actionLogs = await ActionLog.find(query)
            .populate('projectId', 'name apiKeys')
            .sort({ accessRequestTimestamp: -1 })
            .skip(skip)
            .limit(Number(limit));

        const totalCount = await ActionLog.countDocuments(query);

        res.json({
            success: true,
            actionLogs,
            totalCount,
            currentPage: Number(page),
            totalPages: Math.ceil(totalCount / limit)
        });
    } catch (error) {
        console.error('Error fetching action logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch action logs',
            error: error.message
        });
    }
}
exports.getActionLogByProjectId = async (req, res) => {
    try {
        const { projectId } = req.params;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admins only.'
            });
        }
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }
        if (project.blocked && user.role == 'user') {
            return res.status(403).json({
                success: false,
                message: 'Project is blocked and cannot log actions'
            });
        }
        if (project.isDeleted && user.role == 'user') {
            return res.status(403).json({
                success: false,
                message: 'Project is deleted and cannot log actions'
            });
        }
        let query = {};

        if (user.role == 'user') {
            query = {
                _id:new  mongoose.Types.ObjectId(projectId),
                // Filter by user ID if not admin
                $or: [
                    { createdBy: req.user.id },
                    {
                        'teamMembers.user': req.user.id,

                    }
                ]
            }; // Filter by user ID if not admin
        }
        if (user.role == 'admin') {
            query = {
                _id: new mongoose.Types.ObjectId(projectId),
            };
        }
        if (user.role !== 'admin' && user.role !== 'user') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins and users can view action logs.'
            });
        }
        const FoundProject = await Project.findOne(query);
        if (!FoundProject) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Project not found or you do not have permission to view it.'
            });
        }
        const actionLogs = await ActionLog.find({ projectId })
            .populate('projectId', 'name apiKeys')
            .sort({ accessRequestTimestamp: -1 });

        if (actionLogs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No action logs found for this project'
            });
        }

        res.json({
            success: true,
            actionLogs
        });
    } catch (error) {
        console.error('Error fetching action logs by project ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch action logs by project ID',
            error: error.message
        });
    }
}   