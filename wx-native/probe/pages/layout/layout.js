Page({
  data: {
    sheet: false,
    cards: [
      { n: '安贞·富仁名苑店', p: '63' }, { n: '芍药居北里店', p: '66' },
      { n: '建国门外·通用时代店', p: '57' }, { n: '演示门店四', p: '70' }, { n: '演示门店五', p: '72' }
    ]
  },
  open() { this.setData({ sheet: true }); },
  close() { this.setData({ sheet: false }); }
});
