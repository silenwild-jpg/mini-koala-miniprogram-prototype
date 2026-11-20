// 进度步骤条（续租 / 退仓 / 押金 / 实名 / 入仓共用）。steps: [{ t 标题, s 说明, cls: 'done'|'cur'|'fail'|'' }]
Component({
  options: { addGlobalClass: true },
  properties: { steps: { type: Array, value: [] } }
});
