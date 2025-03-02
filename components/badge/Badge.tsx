import PropTypes from '../_util/vue-types';
import ScrollNumber from './ScrollNumber';
import classNames from '../_util/classNames';
import { initDefaultProps, getComponent, getSlot } from '../_util/props-util';
import { cloneElement } from '../_util/vnode';
import { getTransitionProps, Transition } from '../_util/transition';
import isNumeric from '../_util/isNumeric';
import { defaultConfigProvider } from '../config-provider';
import { inject, defineComponent, CSSProperties, VNode, App, Plugin } from 'vue';
import { tuple } from '../_util/type';
import Ribbon from './Ribbon';
import { isPresetColor } from './utils';

const BadgeProps = {
  /** Number to show in badge */
  count: PropTypes.VNodeChild,
  showZero: PropTypes.looseBool,
  /** Max count to show */
  overflowCount: PropTypes.number,
  /** whether to show red dot without number */
  dot: PropTypes.looseBool,
  prefixCls: PropTypes.string,
  scrollNumberPrefixCls: PropTypes.string,
  status: PropTypes.oneOf(tuple('success', 'processing', 'default', 'error', 'warning')),
  color: PropTypes.string,
  text: PropTypes.VNodeChild,
  offset: PropTypes.arrayOf(PropTypes.oneOfType([String, Number])),
  numberStyle: PropTypes.style,
  title: PropTypes.string,
};

const Badge = defineComponent({
  name: 'ABadge',
  Ribbon,
  props: initDefaultProps(BadgeProps, {
    showZero: false,
    dot: false,
    overflowCount: 99,
  }) as typeof BadgeProps,
  setup() {
    return {
      configProvider: inject('configProvider', defaultConfigProvider),
      badgeCount: undefined,
    };
  },
  methods: {
    getNumberedDispayCount() {
      const { overflowCount } = this.$props;
      const count = this.badgeCount;
      const displayCount = count > overflowCount ? `${overflowCount}+` : count;
      return displayCount;
    },

    getDispayCount() {
      const isDot = this.isDot();
      // dot mode don't need count
      if (isDot) {
        return '';
      }
      return this.getNumberedDispayCount();
    },

    getScrollNumberTitle() {
      const { title } = this.$props;
      const count = this.badgeCount;
      if (title) {
        return title;
      }
      return typeof count === 'string' || typeof count === 'number' ? count : undefined;
    },

    getStyleWithOffset() {
      const { offset, numberStyle } = this.$props;
      return offset
        ? {
            right: `${-parseInt(offset[0] as string, 10)}px`,
            marginTop: isNumeric(offset[1]) ? `${offset[1]}px` : offset[1],
            ...numberStyle,
          }
        : { ...numberStyle };
    },
    getBadgeClassName(prefixCls: string, children: VNode[]) {
      const hasStatus = this.hasStatus();
      return classNames(prefixCls, {
        [`${prefixCls}-status`]: hasStatus,
        [`${prefixCls}-dot-status`]: hasStatus && this.dot && !this.isZero(),
        [`${prefixCls}-not-a-wrapper`]: !children.length,
      });
    },
    hasStatus() {
      const { status, color } = this.$props;
      return !!status || !!color;
    },
    isZero() {
      const numberedDispayCount = this.getNumberedDispayCount();
      return numberedDispayCount === '0' || numberedDispayCount === 0;
    },

    isDot() {
      const { dot } = this.$props;
      const isZero = this.isZero();
      return (dot && !isZero) || this.hasStatus();
    },

    isHidden() {
      const { showZero } = this.$props;
      const displayCount = this.getDispayCount();
      const isZero = this.isZero();
      const isDot = this.isDot();
      const isEmpty = displayCount === null || displayCount === undefined || displayCount === '';
      return (isEmpty || (isZero && !showZero)) && !isDot;
    },

    renderStatusText(prefixCls: string) {
      const text = getComponent(this, 'text');
      const hidden = this.isHidden();
      return hidden || !text ? null : <span class={`${prefixCls}-status-text`}>{text}</span>;
    },

    renderDispayComponent() {
      const count = this.badgeCount;
      const customNode = count;
      if (!customNode || typeof customNode !== 'object') {
        return undefined;
      }
      return cloneElement(
        customNode,
        {
          style: this.getStyleWithOffset(),
        },
        false,
      );
    },

    renderBadgeNumber(prefixCls: string, scrollNumberPrefixCls: string) {
      const { status, color } = this.$props;
      const count = this.badgeCount;
      const displayCount = this.getDispayCount();
      const isDot = this.isDot();
      const hidden = this.isHidden();

      const scrollNumberCls = {
        [`${prefixCls}-dot`]: isDot,
        [`${prefixCls}-count`]: !isDot,
        [`${prefixCls}-multiple-words`]:
          !isDot && count && count.toString && count.toString().length > 1,
        [`${prefixCls}-status-${status}`]: !!status,
        [`${prefixCls}-status-${color}`]: isPresetColor(color),
      };

      let statusStyle = this.getStyleWithOffset();
      if (color && !isPresetColor(color)) {
        statusStyle = statusStyle || {};
        statusStyle.background = color;
      }

      return hidden ? null : (
        <ScrollNumber
          prefixCls={scrollNumberPrefixCls}
          data-show={!hidden}
          v-show={!hidden}
          class={scrollNumberCls}
          count={displayCount}
          displayComponent={this.renderDispayComponent()}
          title={this.getScrollNumberTitle()}
          style={statusStyle}
          key="scrollNumber"
        />
      );
    },
  },

  render() {
    const {
      prefixCls: customizePrefixCls,
      scrollNumberPrefixCls: customizeScrollNumberPrefixCls,
      status,
      color,
    } = this;

    const text = getComponent(this, 'text');
    const getPrefixCls = this.configProvider.getPrefixCls;
    const prefixCls = getPrefixCls('badge', customizePrefixCls);
    const scrollNumberPrefixCls = getPrefixCls('scroll-number', customizeScrollNumberPrefixCls);

    const children = getSlot(this);
    let count = getComponent(this, 'count');
    if (Array.isArray(count)) {
      count = count[0];
    }
    this.badgeCount = count;
    const scrollNumber = this.renderBadgeNumber(prefixCls, scrollNumberPrefixCls);
    const statusText = this.renderStatusText(prefixCls);
    const statusCls = classNames({
      [`${prefixCls}-status-dot`]: this.hasStatus(),
      [`${prefixCls}-status-${status}`]: !!status,
      [`${prefixCls}-status-${color}`]: isPresetColor(color),
    });
    const statusStyle: CSSProperties = {};
    if (color && !isPresetColor(color)) {
      statusStyle.background = color;
    }
    // <Badge status="success" />
    if (!children.length && this.hasStatus()) {
      const styleWithOffset = this.getStyleWithOffset();
      const statusTextColor = styleWithOffset && styleWithOffset.color;
      return (
        <span class={this.getBadgeClassName(prefixCls, children)} style={styleWithOffset}>
          <span class={statusCls} style={statusStyle} />
          <span style={{ color: statusTextColor }} class={`${prefixCls}-status-text`}>
            {text}
          </span>
        </span>
      );
    }

    const transitionProps = getTransitionProps(children.length ? `${prefixCls}-zoom` : '');

    return (
      <span class={this.getBadgeClassName(prefixCls, children)}>
        {children}
        <Transition {...transitionProps}>{scrollNumber}</Transition>
        {statusText}
      </span>
    );
  },
});

Badge.install = function(app: App) {
  app.component(Badge.name, Badge);
  app.component(Badge.Ribbon.displayName, Badge.Ribbon);
  return app;
};

export default Badge as typeof Badge &
  Plugin & {
    readonly Ribbon: typeof Ribbon;
  };
