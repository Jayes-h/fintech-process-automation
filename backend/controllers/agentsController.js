const Agents = require('../models/Agents');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all agents
 */
exports.getAllAgents = async (req, res, next) => {
  try {
    const agents = await Agents.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: agents });
  } catch (error) {
    next(error);
  }
};

/**
 * Get agent by ID
 */
exports.getAgentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agent = await Agents.findOne({ where: { agentId: id } });
    
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    
    res.json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new agent
 */
exports.createAgent = async (req, res, next) => {
  try {
    const { agentName, agentDescription, createdBy, subAgentsId } = req.body;
    
    if (!agentName) {
      return res.status(400).json({ success: false, message: 'Agent name is required' });
    }

    const agent = await Agents.create({
      agentName,
      agentDescription: agentDescription || '',
      createdBy: createdBy || 'system',
      subAgentsId: subAgentsId || []
    });

    res.status(201).json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
};

/**
 * Update agent
 */
exports.updateAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agentName, agentDescription, subAgentsId } = req.body;

    const agent = await Agents.findOne({ where: { agentId: id } });
    
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    await agent.update({
      agentName: agentName || agent.agentName,
      agentDescription: agentDescription !== undefined ? agentDescription : agent.agentDescription,
      subAgentsId: subAgentsId !== undefined ? subAgentsId : agent.subAgentsId
    });

    res.json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete agent
 */
exports.deleteAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agent = await Agents.findOne({ where: { agentId: id } });
    
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    await agent.destroy();
    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    next(error);
  }
};









