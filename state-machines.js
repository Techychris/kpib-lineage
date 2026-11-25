// Explicit finite state machines for kpib-lineage UI components.
// Eliminates scattered booleans, DOM-as-state scraping, and impossible state combinations.
(function (root) {
  'use strict';

  function createMachine(initialState, reducer) {
    let state = initialState;
    const listeners = new Set();
    return {
      getState() { return state; },
      send(event) {
        const next = reducer(state, event);
        if (next === state) return state;
        state = next;
        for (const fn of listeners) fn(state, event);
        return state;
      },
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };
  }

  // 1. Theme FSM: 'light' <-> 'dark'
  function createThemeMachine(initial) {
    const start = initial === 'dark' ? 'dark' : 'light';
    return createMachine(start, (state, event) => {
      if (event.type === 'TOGGLE') return state === 'dark' ? 'light' : 'dark';
      if (event.type === 'SET') return event.theme === 'dark' ? 'dark' : 'light';
      return state;
    });
  }

  // 2. Binary Toggle FSM (Mobile Nav Menu, rAF Scheduler, etc.): 'closed' <-> 'open' (or custom states)
  function createToggleMachine(closedState, openState, initialOpen) {
    return createMachine(initialOpen ? openState : closedState, (state, event) => {
      if (event.type === 'OPEN') return openState;
      if (event.type === 'CLOSE') return closedState;
      if (event.type === 'TOGGLE') return state === openState ? closedState : openState;
      return state;
    });
  }

  // 3. Script Loader FSM: 'idle' -> 'loading' -> 'loaded' | 'error' (retryable from 'error')
  function createLoaderMachine() {
    return createMachine({ status: 'idle', promise: null }, (state, event) => {
      if (event.type === 'START') {
        if (state.status === 'loading' || state.status === 'loaded') return state;
        return { status: 'loading', promise: event.promise };
      }
      if (event.type === 'RESOLVE' && state.status === 'loading') {
        return { status: 'loaded', promise: state.promise };
      }
      if (event.type === 'REJECT' && state.status === 'loading') {
        return { status: 'error', promise: null };
      }
      return state;
    });
  }

  // 4. Combobox FSM: 'closed' | 'open' | 'interacting'
  // Replaces racy `keep` boolean + DOM hidden/aria-selected state tracking.
  function createComboboxMachine() {
    const CLOSED = { status: 'closed', items: [], totalHits: 0, activeIndex: -1 };
    return createMachine(CLOSED, (state, event) => {
      switch (event.type) {
        case 'RESULTS':
          if (!event.hasQuery) return state.status === 'closed' ? state : CLOSED;
          return {
            status: 'open',
            items: event.items,
            totalHits: event.totalHits,
            activeIndex: -1,
          };
        case 'ARROW_DOWN':
          if (state.status === 'closed') return state;
          return { ...state, activeIndex: Math.min(state.items.length - 1, state.activeIndex + 1) };
        case 'ARROW_UP':
          if (state.status === 'closed') return state;
          return { ...state, activeIndex: Math.max(-1, state.activeIndex - 1) };
        case 'POINTER_DOWN_LIST':
          if (state.status === 'closed') return state;
          return { ...state, status: 'interacting' };
        case 'BLUR':
          if (state.status === 'interacting') return { ...state, status: 'open' };
          return state.status === 'closed' ? state : CLOSED;
        case 'CLOSE':
          return state.status === 'closed' ? state : CLOSED;
        default:
          return state;
      }
    });
  }

  // 5. Member Table FSM: single source of truth for query, school filter, sort, drawer, and result status
  function createTableMachine(initial) {
    const base = {
      query: typeof initial?.query === 'string' ? initial.query : '',
      school: initial?.school ?? null,
      sortColumn: initial?.sortColumn || 'crossing',
      sortDirection: initial?.sortDirection === -1 ? -1 : 1,
      drawer: 'closed',
    };
    return createMachine(base, (state, event) => {
      switch (event.type) {
        case 'SET_QUERY':
          return { ...state, query: event.query };
        case 'SET_SCHOOL':
          return event.school === state.school ? state : { ...state, school: event.school };
        case 'TOGGLE_SORT': {
          const direction = event.column === state.sortColumn
            ? -state.sortDirection
            : event.column === 'kids' ? -1 : 1;
          return { ...state, sortColumn: event.column, sortDirection: direction };
        }
        case 'SET_SORT':
          return { ...state, sortColumn: event.column, sortDirection: event.direction === -1 ? -1 : 1 };
        case 'TOGGLE_DRAWER':
          return { ...state, drawer: state.drawer === 'open' ? 'closed' : 'open' };
        case 'RESTORE':
          return {
            ...state,
            query: event.query,
            school: event.school,
            sortColumn: event.sortColumn,
            sortDirection: event.sortDirection === -1 ? -1 : 1,
          };
        default:
          return state;
      }
    });
  }

  // 6. Lineage Tree Explorer FSM
  // Discriminated view union prevents impossible combinations of branch/selected/listView/full/connections.
  // view.type: 'founders' | 'overview' | 'unresolved' | 'member-tree' | 'member-generations'
  function createTreeMachine(config) {
    const isPhone = Boolean(config.isPhone);
    const initial = {
      isPhone,
      lineageMode: config.lineageMode === 'dad' ? 'dad' : 'big',
      orientation: isPhone ? 'horizontal' : 'vertical',
      depthMode: config.depthMode === 'full' ? 'full' : 'auto',
      popover: 'closed',
      connections: 'closed',
      view: isPhone ? { type: 'founders' } : { type: 'overview' },
    };

    function rootViewFor(phoneMode) {
      return phoneMode ? { type: 'founders' } : { type: 'overview' };
    }

    return createMachine(initial, (state, event) => {
      switch (event.type) {
        case 'SELECT_MEMBER': {
          const keepList = state.view.type === 'member-generations';
          const scope = state.view.type === 'member-tree' || state.view.type === 'member-generations'
            ? state.view.scope
            : 'downstream';
          return {
            ...state,
            popover: 'closed',
            connections: 'closed',
            view: {
              type: keepList ? 'member-generations' : 'member-tree',
              memberId: event.memberId,
              branchRoot: event.branchRoot,
              scope,
            },
          };
        }
        case 'SHOW_OVERVIEW':
          return {
            ...state,
            popover: 'closed',
            connections: 'closed',
            view: rootViewFor(state.isPhone),
          };
        case 'SHOW_UNRESOLVED':
          return {
            ...state,
            popover: 'closed',
            connections: 'closed',
            view: event.hasFloating ? { type: 'unresolved' } : rootViewFor(state.isPhone),
          };
        case 'SET_VIEW_MODE': {
          if (state.view.type !== 'member-tree' && state.view.type !== 'member-generations') return state;
          const targetType = event.mode === 'generations' ? 'member-generations' : 'member-tree';
          if (state.view.type === targetType) return state;
          return {
            ...state,
            popover: 'closed',
            view: { ...state.view, type: targetType },
          };
        }
        case 'SET_SCOPE': {
          if (state.view.type !== 'member-tree' && state.view.type !== 'member-generations') return state;
          const scope = event.scope === 'branch' ? 'branch' : 'downstream';
          return { ...state, view: { ...state.view, scope } };
        }
        case 'SET_DEPTH_MODE':
          return { ...state, depthMode: event.depthMode === 'full' ? 'full' : 'auto' };
        case 'SET_ORIENTATION':
          return {
            ...state,
            popover: 'closed',
            orientation: event.orientation === 'horizontal' ? 'horizontal' : 'vertical',
          };
        case 'SET_LINEAGE_MODE': {
          const lineageMode = event.lineageMode === 'dad' ? 'dad' : 'big';
          let view = state.view;
          if (view.type === 'unresolved' && !event.hasFloating) {
            view = rootViewFor(state.isPhone);
          } else if (view.type === 'member-tree' || view.type === 'member-generations') {
            view = { ...view, branchRoot: event.branchRoot };
          }
          return { ...state, lineageMode, popover: 'closed', connections: 'closed', view };
        }
        case 'TOGGLE_POPOVER':
          return { ...state, popover: state.popover === 'open' ? 'closed' : 'open' };
        case 'CLOSE_POPOVER':
          return state.popover === 'closed' ? state : { ...state, popover: 'closed' };
        case 'OPEN_CONNECTIONS':
          if (state.view.type !== 'member-tree' && state.view.type !== 'member-generations') return state;
          return { ...state, popover: 'closed', connections: 'open' };
        case 'CLOSE_CONNECTIONS':
          return state.connections === 'closed' ? state : { ...state, connections: 'closed' };
        case 'VIEWPORT_CHANGED': {
          const nextPhone = Boolean(event.isPhone);
          let view = state.view;
          if (view.type === 'founders' && !nextPhone) view = { type: 'overview' };
          else if (view.type === 'overview' && nextPhone) view = { type: 'founders' };
          return { ...state, isPhone: nextPhone, popover: 'closed', view };
        }
        default:
          return state;
      }
    });
  }

  const api = {
    createMachine,
    createThemeMachine,
    createToggleMachine,
    createLoaderMachine,
    createComboboxMachine,
    createTableMachine,
    createTreeMachine,
  };

  root.kpibMachines = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
