/**
 * 按日期对记录进行排序（最新的排在前面）
 * @param {Array} records - 要排序的记录数组
 * @returns {Array} 排序后的记录数组
 */
const sortRecordsByDate = records => {
  return [...records].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA;  // 降序排列，最新的在前面
  });
}

module.exports = {
  sortRecordsByDate: sortRecordsByDate
};
