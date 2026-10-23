# U01 Visual QA Report

## Sprint 1F — U01 仓位与价格

### 自动化结果

- Baseline Runner: **36 / 36 authoritative JS tests PASS**
- Static package: **45 HTML / 28 inline scripts / 430 local references**
- U01 Body byte-identical: **PASS**

### 设备验证

| 状态 | 375×812 | 390×844 |
|---|---|---|
| 默认 6 个月 / 特价仓 | PASS | PASS |
| 租期选择展开 | PASS | PASS |
| 搬运支持 | PASS | PASS |

### Runtime 指标

- `375_default`：JS error 0；页面横向溢出 0；内部异常溢出 0；核心区域碰撞 0。
- `375_transport`：JS error 0；页面横向溢出 0；内部异常溢出 0；核心区域碰撞 0。
- `375_term_open`：JS error 0；页面横向溢出 0；内部异常溢出 0；核心区域碰撞 0。
- `390_default`：JS error 0；页面横向溢出 0；内部异常溢出 0；核心区域碰撞 0。
- `390_transport`：JS error 0；页面横向溢出 0；内部异常溢出 0；核心区域碰撞 0。
- `390_term_open`：JS error 0；页面横向溢出 0；内部异常溢出 0；核心区域碰撞 0。

### 价格层级

- 375：整期总租金 32px；月租 14px；预计本次应付 20px。
- 390：整期总租金 34px；月租 14px；预计本次应付 20px。
- 主价格 > 月租 2 倍视觉尺度。
- 折扣角标内部折行：0。
- “特价”标签折行：0。

### 结论

**PASS — 可将 Sprint 1F 标记为完成。**
