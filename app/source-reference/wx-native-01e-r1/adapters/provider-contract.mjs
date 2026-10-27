/** The host application must implement this provider; no successful demo fallback. */
export function createUnconnectedProvider() {
  return {
    async isVerified() { return false; },
    async requestVerification() { return {ok:false,reason:'backend_unavailable'}; }
  };
}

/** For local unit-test/demo ONLY. Do not use in central source. */
export function createTestProvider({verified = false, verificationAnswer = {ok:true}}={}) {
  const state = {verified,prompts:0,checkCount:0,verificationAnswer};
  return {
    state,
    async isVerified() { state.checkCount++; return state.verified; },
    async requestVerification() {
      state.prompts++;
      if (state.verificationAnswer.ok) state.verified=true;
      return state.verificationAnswer;
    }
  };
}
