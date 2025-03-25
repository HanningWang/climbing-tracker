// pages/layout/layout.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentTab: 0,
    showProfileCard: false,
    avatarUrl: defaultAvatarUrl,
    nickname: '匿名用户'
  },

  /**
   * 切换选项卡
   */
  switchTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      currentTab: index
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // Load saved profile data if available
    const avatarUrl = wx.getStorageSync('avatarUrl');
    const nickname = wx.getStorageSync('nickname');
    
    if (avatarUrl) {
      this.setData({ avatarUrl });
    }
    
    if (nickname) {
      this.setData({ nickname });
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '攀岩突破记',
      path: '/pages/layout/layout'
    }
  },

  showProfileCard: function() {
    this.setData({
      showProfileCard: true
    });
  },

  hideProfileCard: function() {
    this.setData({
      showProfileCard: false
    });
  },

  preventBubble: function(e) {
    // Prevent the tap event from bubbling to parent
  },

  onChooseAvatar: function(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl
    });
  },

  onInputNickname: function(e) {
    this.setData({
      nickname: e.detail.value
    });
  },

  saveProfile: function() {
    // Save profile data to storage
    wx.setStorageSync('avatarUrl', this.data.avatarUrl);
    wx.setStorageSync('nickname', this.data.nickname);
    
    // Show success message
    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 2000
    });
    
    // Close the profile card
    this.hideProfileCard();
  }
})