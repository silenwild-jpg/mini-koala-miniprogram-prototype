// tab 空壳 + 40 行长列表：看滚动是否顺畅、下拉刷新、列表底部是否被 tabBar 盖住。
const names = ['安贞·富仁名苑店', '芍药居北里店', '建国门外·通用时代店'];
const list = [];
for (let i = 0; i < 40; i++) list.push({ id: i, name: names[i % 3], no: i + 1 });

Page({
  data: { list: list },
  onPullDownRefresh() { setTimeout(() => wx.stopPullDownRefresh(), 600); }
});
