/**
 * Generates an ISO week key in the format YYYY-W##
 * Weeks start on Monday.
 */
export function getWeekKey(date: Date = new Date()): string {
    const target = new Date(date.valueOf());
    // ISO week date helper: weekday 0 is Monday, 6 is Sunday
    const dayNr = (date.getDay() + 6) % 7;
    // Set to nearest Thursday: current date + 4 - current day number
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();

    // Set to Jan 1st
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }

    const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const year = new Date(firstThursday).getFullYear();

    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}
