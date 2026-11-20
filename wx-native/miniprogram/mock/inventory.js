// 来源库存保持原样；运行时演示分配在一份共享副本中完成，报价与各页面读取同一份。
const source = require('./units');
module.exports = require('./specials').assign(source.map(u => Object.assign({}, u)));
