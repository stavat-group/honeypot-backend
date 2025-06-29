const crypto = require('crypto')
const Project = require('../models/project_model');
const User = require('../models/user_model');

// Create new project
exports.createProject = async (req, res) => {
    try {
        const { name, description, techStack } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: 'Name and description are required'
            });
        }

        const project = new Project({
            name,
            description,
            techStack,
            createdBy: userId,
            teamMembers: [{
                user: userId,
                role: 'admin'
            }]
        });
        if (await Project.exists({ name, createdBy: userId })) {
            return res.status(400).json({
                success: false,
                message: 'Project with this name already exists for this user'
            });
        }

        await project.save();




        res.status(201).json({
            success: true,
            data:
                project,

            message: 'Project created successfully'
        });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Project name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// Get all projects (with pagination)
exports.getAllProjects = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const userId = req.user.id;
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        let query = {};
        if (user.role !== 'admin') {
            query = {

                createdBy: userId,
                // { 'teamMembers.user': userId }
                isDeleted: false
            };
        } else {
            query = {}
        }

        const projects = await Project.find(query)
            .populate('createdBy', 'displayName email')
            .populate('teamMembers.user', 'displayName email')
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Project.countDocuments();

        res.json({
            success: true,
            data: projects,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};
exports.updateProject = async (req, res) => {
    try {
        const updateData = req.body;
        const projectId = req.params.id;
        const foundProject = await Project.findById(projectId);
        if (!foundProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Validate project exists and user has access
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { createdBy: req.user.id },
                {
                    'teamMembers.user': req.user.id,
                    'teamMembers.role': { $in: ['admin', 'developer'] }
                }
            ]
        })
            .populate('createdBy', 'displayName email')
            .populate('teamMembers.user', 'displayName email');

        if (!project) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to edit this project'
            });
        }
        if (updateData.name && updateData.name !== project.name) {

            if (await Project.exists({ name: updateData.name, createdBy: req.user.id })) {
                return res.status(400).json({
                    success: false,
                    message: 'Project with this name already exists for this user'
                });
            }
        }

        // Update project details
        project.name = updateData.name || project.name;
        project.description = updateData.description || project.description;
        project.techStack = updateData.techStack || project.techStack;

        await project.save();

        res.json({
            success: true,
            data: project,
            message: 'Project updated successfully'
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// Get project by ID with full details
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('createdBy')
            .populate('teamMembers.user', 'displayName email')
            .populate('apiKeys');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }


        res.json({
            success: true,
            data: project
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// Generate new API key for project
exports.generateApiKey = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;
        const foundProject = await Project.findById(projectId);
        if (!foundProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }
        if (foundProject.isDeleted) {
            return res.status(400).json({
                success: false,
                message: 'Project is deleted and cannot generate API key'
            });
        }
        if (foundProject.blocked) {
            return res.status(400).json({
                success: false,
                message: 'Project is blocked and cannot generate API key'
            });
        }
        if (foundProject.apiKeys) {
            return res.status(400).json({
                success: false,
                message: 'API key already exists for this project'
            });
        }

        // Validate project exists and user has access
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { createdBy: userId },
                {
                    'teamMembers.user': userId,
                    'teamMembers.role': { $in: ['admin', 'developer'] }
                }
            ]
        });

        if (!project) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to generate API key for this project'
            });
        }

        // Generate new API key
        let apiKey;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!isUnique && attempts < maxAttempts) {
            attempts++;
            apiKey = crypto.randomBytes(32).toString('hex');

            // Check if key exists in any project
            const existingProject = await Project.findOne({
                apiKeys: apiKey
            });

            if (!existingProject) {
                isUnique = true;
            }
        }

        if (!isUnique) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate unique API key after multiple attempts'
            });
        }
        project.apiKeys = apiKey;
        await project.save();

        res.json({
            success: true,
            data: { apiKey },
            project: project,
            message: 'API key generated successfully'
        });

    } catch (err) {
        console.error('Error generating API key:', err);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};
exports.deleteProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;
        const foundProject = await Project.findById(projectId);
        if (!foundProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Validate project exists and user has access
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { createdBy: userId },
                {
                    'teamMembers.user': userId,
                    'teamMembers.role': { $in: ['admin', 'developer'] }
                }
            ]
        });

        if (!project) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this project'
            });
        }

        // Soft delete the project
        project.isDeleted = true;
        await project.save();

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

exports.activeOrInactiveProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;
        const foundProject = await Project.findById(projectId);
        if (!foundProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        };
        if (foundProject.isDeleted) {
            return res.status(400).json({
                success: false,
                message: 'Project is deleted and cannot be activated or deactivated'
            });
        }

        if (foundProject.blocked) {
            return res.status(400).json({
                success: false,
                message: 'Project is blocked and cannot generate API key'
            });
        }
        // Validate project exists and user has access
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { createdBy: userId },
                {
                    'teamMembers.user': userId,
                    'teamMembers.role': { $in: ['admin', 'developer'] }
                }
            ]
        });

        if (!project) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this project'
            });
        }

        // Soft delete the project
        project.isActive = !project.isActive;
        await project.save();

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};
exports.blockOrUnblockProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;
        const foundProject = await Project.findById(projectId);
        if (!foundProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        };
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            })
        }
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to block or unblock projects'
            });
        }


        // Validate project exists and user has access
        const project = await Project.findOne({
            _id: projectId,
        });



        // Toggle block status
        project.blocked = !project.blocked;
        await project.save();

        res.json({
            success: true,
            message: `Project ${project.blocked ? 'blocked' : 'unblocked'} successfully`
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

exports.validateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.header('x-api-key');
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API key is required'
            });
        }
        const project = await Project.findOne({
            apiKeys: apiKey
        });
        if (!project) {
            return res.status(401).json({
                success: false,
                message: 'Invalid API key'
            });
        }
        if (project.isDeleted) {
            return res.status(400).json({
                success: false,
                message: 'Project is deleted and cannot access API'
            });
        }
        if (project.blocked) {
            return res.status(400).json({
                success: false,
                message: 'Project is blocked and cannot access API'
            });
        }
        if (project.isActive === false) {
            return res.status(400).json({
                success: false,
                message: 'Project is inactive and cannot access API'
            });
        }
        const user = await User.findById(project.createdBy);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (user.blockUser) {
            return res.status(400).json({
                success: false,
                message: 'User is blocked and cannot access API'
            });
        }
        res.json({
            success: true,
            message: 'API key is valid',
            projectInfo: {
                _id: project._id,
                name: project.name,
                apiKeys: project.apiKeys
            },
            project: project,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};