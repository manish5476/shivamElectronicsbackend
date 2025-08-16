// This file contains helper functions used by multiple dashboard controllers.

/**
 * Calculates start and end dates based on a period string or custom dates.
 */
exports.getDateRange = (period, queryStartDate, queryEndDate) => {
    let startDate;
    let endDate;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (queryStartDate && queryEndDate) {
        startDate = new Date(queryStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(queryEndDate);
        endDate.setHours(23, 59, 59, 999);
        if (endDate > today) {
            endDate = new Date(today);
        }
        return { startDate, endDate };
    }

    endDate = new Date(today);

    switch (period) {
        case 'today':
            startDate = new Date(today);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            startDate = yesterday;
            endDate = new Date(yesterday);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay());
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'last_month':
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
            endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            break;
        default:
            return { startDate: null, endDate: null };
    }
    return { startDate, endDate };
};

/**
 * Helper function to get ISO week number.
 */
exports.getISOWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7)); // Nearest Thursday
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

/**
 * Helper function to get the first day (Monday) of an ISO week.
 */
exports.getFirstDayOfISOWeek = (week, year) => {
    const firstJan = new Date(year, 0, 1);
    const dayOfWeek = firstJan.getDay();
    const firstMonday = new Date(year, 0, 1 + (dayOfWeek <= 1 ? 1 - dayOfWeek : 8 - dayOfWeek));
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
};