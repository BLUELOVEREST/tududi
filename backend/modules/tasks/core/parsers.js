const { Task } = require('../../../models');

function parsePriority(priority) {
    if (priority === undefined) return null;
    return typeof priority === 'string'
        ? Task.getPriorityValue(priority)
        : priority;
}

function parseStatus(status, defaultStatus = Task.STATUS.PLANNED) {
    if (status === undefined) return defaultStatus;
    return typeof status === 'string' ? Task.getStatusValue(status) : status;
}

module.exports = {
    parsePriority,
    parseStatus,
};
