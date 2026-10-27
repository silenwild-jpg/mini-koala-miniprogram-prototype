/**
 * Four-branch wiring contract. Do not replace existing page implementations;
 * wrap ORIGINAL action handlers and preserve their inputs/call signatures.
 */
export function makeAuthEntrypoints({gate, getContext, quoteAction, orderAction, submitOrderAction, makeOperationId}) {
  if (!gate || !getContext || !quoteAction || !orderAction || !submitOrderAction || !makeOperationId) {
    throw new TypeError('All shared route/adaptor dependencies are required');
  }
  function guard(intent, actionKey, handler) {
    const contextSnapshot = structuredClone(getContext());
    return gate.requireVerifiedPhone({
      intent,actionKey,
      operationId:makeOperationId(actionKey),
      contextSnapshot,
      getCurrentContext:() => getContext(),
      action:()=>handler(contextSnapshot)
    });
  }
  return {
    /** BRANCH-02 CAP and BRANCH-04 S5: prevent the quote from loading/rendering before auth */
    onRequestQuote:() => guard('QUOTE','GET_OFFICIAL_QUOTE',quoteAction),
    /** BRANCH-01 H01 quick-order, BRANCH-03 S01/S02/U01, BRANCH-04 quick-order */
    onImmediateOrder:() => guard('ORDER','OPEN_O01',orderAction),
    /** O01 route-entry/read guard: reveal protected order view only if status===executed. */
    onEnterOrder:() => guard('ORDER','ENTER_O01',async()=>({allowOrderPage:true})),
    /** O01 submit guard: server-side session+snapshot validation is still required. */
    onSubmitOrder:() => guard('ORDER','SUBMIT_O01',submitOrderAction)
  };
}
