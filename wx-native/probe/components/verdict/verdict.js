const log = require('../../utils/log');
const cases = require('../../utils/cases');

Component({
  properties: { caseId: { type: String, value: '' } },
  data: { title: '', v: '', note: '' },
  lifetimes: {
    attached() { this.refresh(); }
  },
  pageLifetimes: {
    show() { this.refresh(); }
  },
  methods: {
    refresh() {
      const id = this.data.caseId;
      const c = cases.filter((x) => x.id === id)[0];
      const saved = log.verdicts()[id] || {};
      this.setData({ title: c ? c.title : '', v: saved.v || '', note: saved.note || '' });
    },
    onPick(e) {
      const v = e.currentTarget.dataset.v;
      log.setVerdict(this.data.caseId, v, this.data.note);
      this.setData({ v: v });
    },
    onNote(e) {
      const note = e.detail.value;
      this.setData({ note: note });
      if (this.data.v) log.setVerdict(this.data.caseId, this.data.v, note);
    }
  }
});
