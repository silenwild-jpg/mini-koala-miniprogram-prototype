(function(root){
/**
 * WX-NATIVE-01E-R1 - fail-closed, framework-independent phone authorization gate.
 * This is Git-ready integration code, NOT a modification of any central source ZIP.
 * The host must enforce authorization AGAIN on protected quote/order endpoints.
 */
class PhoneGate {
  constructor({provider, onTransition = () => {}, maxCompleted = 200}) {
    if (!provider || typeof provider.isVerified !== 'function' ||
        typeof provider.requestVerification !== 'function') {
      throw new TypeError('provider must define isVerified() and requestVerification()');
    }
    this.provider = provider;
    this.onTransition = onTransition;
    this.maxCompleted = maxCompleted;
    this.active = new Map();
    this.completed = new Map();
    this.state = 'UNVERIFIED';
  }

  transition(state, detail = {}) {
    this.state = state;
    this.onTransition(state, detail);
  }

  /** Inputs: { intent: 'QUOTE'|'ORDER', operationId, actionKey,
   * contextSnapshot, getCurrentContext, action }.
   * action() is called only after a fresh verification check and context check.
   */
  requireVerifiedPhone(request) {
    const {intent, operationId, actionKey, contextSnapshot, getCurrentContext, action} = request || {};
    if (!['QUOTE', 'ORDER'].includes(intent)) throw new TypeError('intent must be QUOTE or ORDER');
    if (typeof operationId !== 'string' || !operationId.trim()) throw new TypeError('operationId required');
    if (typeof actionKey !== 'string' || !actionKey.trim()) throw new TypeError('actionKey required');
    if (typeof getCurrentContext !== 'function' || typeof action !== 'function') throw new TypeError('context/action callbacks required');
    if (!contextSnapshot || typeof contextSnapshot !== 'object' || Array.isArray(contextSnapshot)) throw new TypeError('contextSnapshot object required');
    if (this.completed.has(operationId)) return Promise.resolve({status:'duplicate', operationId});
    if (this.active.has(operationId)) return this.active.get(operationId);
    // One pending permission request at a time: second distinct operation must be retried.
    if (this.active.size) return Promise.resolve({status:'busy', operationId});
    const task = this.execute({intent,operationId,actionKey,contextSnapshot:clone(contextSnapshot),getCurrentContext,action})
      .finally(() => this.active.delete(operationId));
    this.active.set(operationId, task);
    return task;
  }

  async execute({intent,operationId,actionKey,contextSnapshot,getCurrentContext,action}) {
    let verified;
    try { verified = !!(await this.provider.isVerified()); }
    catch (e) { this.transition('AUTH_FAILED',{reason:'session_check_error'}); return {status:'failed',reason:'session_check_error'}; }

    if (!verified) {
      this.transition('LOGIN_OPEN',{intent,actionKey});
      let answer;
      try { answer = await this.provider.requestVerification({intent, actionKey}); }
      catch (e) { this.transition('AUTH_FAILED',{reason:'verification_error'}); return {status:'failed',reason:'verification_error'}; }
      if (!answer?.ok) {
        const reason = answer?.reason || 'cancelled';
        this.transition(reason === 'cancelled' || reason === 'declined' ? 'DECLINED' : 'AUTH_FAILED',{reason});
        return {status:reason === 'cancelled' || reason === 'declined'?'cancelled':'failed',reason};
      }
    }

    // The UI response does not establish trust. Revalidate from service/session.
    try { verified = !!(await this.provider.isVerified()); }
    catch (e) { verified = false; }
    if (!verified) {
      this.transition('UNVERIFIED',{reason:'session_not_verified'});
      return {status:'blocked',reason:'session_not_verified'};
    }

    let current;
    try { current = await getCurrentContext(); }
    catch (e) { return {status:'blocked',reason:'context_read_failed'}; }
    if (stable(current) !== stable(contextSnapshot)) {
      this.transition('VERIFIED',{reason:'context_changed'});
      return {status:'stale',reason:'context_changed'};
    }
    // Check again near execution to minimize stale sessions; server MUST also check.
    try { verified = !!(await this.provider.isVerified()); }
    catch (e) { verified = false; }
    if (!verified) {
      this.transition('EXPIRED');
      return {status:'blocked',reason:'session_expired'};
    }
    this.transition('VERIFIED',{intent,actionKey});
    try {
      const result = await action({intent,actionKey,operationId,contextSnapshot:clone(contextSnapshot)});
      this.completed.set(operationId, Date.now());
      if (this.completed.size > this.maxCompleted) this.completed.delete(this.completed.keys().next().value);
      return {status:'executed',operationId,value:result};
    } catch (e) {
      this.transition('VERIFIED',{reason:'protected_action_error'});
      return {status:'action_failed',reason:'protected_action_error'};
    }
  }
}

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k)+':'+stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

root.SIM_PHONE_GATE=PhoneGate;
})(window);
