const { createSSRApp, defineComponent, h } = require('vue')
const { renderToString } = require('@vue/server-renderer')
const path = require('path')

function loadComponent(modulePath) {
  const resolved = modulePath.startsWith('@/') ?
    path.join(process.cwd(), modulePath.slice(2)) :
    modulePath
  const mod = require(resolved)
  return mod.default || mod
}

async function renderComponent(component, props = {}) {
  const app = createSSRApp({
    render: () => h(component, props),
  })
  app.component('scroll-view', defineComponent({
    name: 'ScrollViewStub',
    setup(_, { slots }) {
      return () => h('div', { class: 'scroll-view-stub' }, slots.default ? slots.default() : [])
    },
  }))
  return renderToString(app)
}

function getEmitNames(component) {
  if (Array.isArray(component.emits)) return component.emits
  return Object.keys(component.emits || {})
}

function getSetupBindings(component, props = {}, emit = () => {}) {
  if (typeof component.setup !== 'function') return {}
  const result = component.setup(props, {
    emit,
    expose: () => {},
    attrs: {},
    slots: {},
  })
  return typeof result === 'function' ? {} : (result || {})
}

function makeStub(name) {
  return defineComponent({
    name,
    props: ['name', 'size', 'color', 'title', 'subtitle', 'actionText', 'actionIcon', 'message'],
    setup(props, { slots }) {
      return () => h(
        'div',
        { class: `${name}-stub`, 'data-name': props.name || '' },
        [
          props.title || '',
          props.subtitle || '',
          props.actionText || '',
          props.message || '',
          slots.default ? slots.default() : null,
        ],
      )
    },
  })
}

module.exports = {
  loadComponent,
  renderComponent,
  getEmitNames,
  getSetupBindings,
  makeStub,
}
