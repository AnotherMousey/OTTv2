// Coordinates one directory navigation, without caching tournament responses.
export function createTournamentOpening() {
  let current = null;
  function cancel() {
    const previous = current;current = null;previous?.controller.abort();
  }
  async function open({id,target,select,navigate,getRoute,onPending,onError}) {
    if (current?.id === id) return false;
    cancel();
    const operation = {id,controller:new AbortController(),origin:getRoute()};
    current = operation;onPending(id);
    const active = () => current === operation && !operation.controller.signal.aborted && getRoute() === operation.origin;
    try {
      const selected = await select(id,{signal:operation.controller.signal,throwOnError:true,isCurrent:active});
      if (!active()) return false;
      if (selected === false) throw Error('Please try again.');
      navigate(target);return true;
    } catch (error) {
      if (active()) onError(error);
      return false;
    } finally {
      if (current === operation) {current=null;onPending('');}
    }
  }
  return {open,cancel};
}
