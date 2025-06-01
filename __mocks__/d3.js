// Comprehensive D3.js mock for testing visualization components

const extent = (array, accessor) => {
  if (!array || array.length === 0) return [0, 1];
  if (accessor) {
    const values = array.map(accessor).filter(v => v != null);
    return values.length > 0
      ? [Math.min(...values), Math.max(...values)]
      : [0, 1];
  }
  return [Math.min(...array), Math.max(...array)];
};

const scaleSequential = interpolator => {
  let domain = [0, 1];
  const scale = value => {
    const t = (value - domain[0]) / (domain[1] - domain[0]);
    return interpolator(Math.max(0, Math.min(1, t)));
  };
  scale.domain = d => {
    if (!d) return domain;
    domain = d;
    return scale;
  };
  return scale;
};

const interpolateViridis = t => {
  // Simple color interpolation
  const colors = [
    [68, 1, 84], // purple
    [49, 104, 142], // blue
    [53, 183, 121], // green
    [253, 231, 37], // yellow
  ];

  const index = t * (colors.length - 1);
  const i = Math.floor(index);
  const f = index - i;

  if (i >= colors.length - 1)
    return `rgb(${colors[colors.length - 1].join(",")})`;
  if (i < 0) return `rgb(${colors[0].join(",")})`;

  const c1 = colors[i];
  const c2 = colors[i + 1];
  const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
  const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
  const b = Math.round(c1[2] + f * (c2[2] - c1[2]));

  return `rgb(${r},${g},${b})`;
};

const scaleLinear = () => {
  let domain = [0, 1];
  let range = [0, 1];

  const scale = value => {
    const t = (value - domain[0]) / (domain[1] - domain[0]);
    return range[0] + t * (range[1] - range[0]);
  };

  scale.domain = d => {
    if (!d) return domain;
    domain = d;
    return scale;
  };

  scale.range = r => {
    if (!r) return range;
    range = r;
    return scale;
  };

  return scale;
};

const select = selector => {
  const selection = {
    selectAll: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    html: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    call: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    classed: jest.fn().mockReturnThis(),
    property: jest.fn().mockReturnThis(),
    datum: jest.fn().mockReturnThis(),
    node: jest.fn().mockReturnValue(null),
    empty: jest.fn().mockReturnValue(false),
    size: jest.fn().mockReturnValue(1),
    each: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    merge: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    lower: jest.fn().mockReturnThis(),
    raise: jest.fn().mockReturnThis(),
  };

  return selection;
};

const zoom = () => {
  const zoomBehavior = {
    scaleExtent: jest.fn().mockReturnThis(),
    translateExtent: jest.fn().mockReturnThis(),
    extent: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    touchable: jest.fn().mockReturnThis(),
    wheelDelta: jest.fn().mockReturnThis(),
    clickDistance: jest.fn().mockReturnThis(),
    tapDistance: jest.fn().mockReturnThis(),
    constrain: jest.fn().mockReturnThis(),
    duration: jest.fn().mockReturnThis(),
    interpolate: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    transform: jest.fn().mockReturnThis(),
    translateBy: jest.fn().mockReturnThis(),
    translateTo: jest.fn().mockReturnThis(),
    scaleBy: jest.fn().mockReturnThis(),
    scaleTo: jest.fn().mockReturnThis(),
  };

  return zoomBehavior;
};

const zoomIdentity = {
  k: 1,
  x: 0,
  y: 0,
  apply: jest.fn(),
  applyX: jest.fn(),
  applyY: jest.fn(),
  invert: jest.fn(),
  invertX: jest.fn(),
  invertY: jest.fn(),
  rescaleX: jest.fn(),
  rescaleY: jest.fn(),
  toString: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
};

const zoomTransform = jest.fn().mockReturnValue(zoomIdentity);

const transition = () => ({
  duration: jest.fn().mockReturnThis(),
  delay: jest.fn().mockReturnThis(),
  ease: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  style: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  tween: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  call: jest.fn().mockReturnThis(),
  each: jest.fn().mockReturnThis(),
  merge: jest.fn().mockReturnThis(),
  filter: jest.fn().mockReturnThis(),
  selection: jest.fn().mockReturnThis(),
  transition: jest.fn().mockReturnThis(),
  end: jest.fn().mockResolvedValue(undefined),
});

const d3 = {
  // Array methods
  extent,
  min: (array, accessor) => {
    if (!array || array.length === 0) return undefined;
    return accessor ? Math.min(...array.map(accessor)) : Math.min(...array);
  },
  max: (array, accessor) => {
    if (!array || array.length === 0) return undefined;
    return accessor ? Math.max(...array.map(accessor)) : Math.max(...array);
  },
  range: (start, stop, step = 1) => {
    const result = [];
    for (let i = start; i < stop; i += step) {
      result.push(i);
    }
    return result;
  },

  // Scale methods
  scaleLinear,
  scaleSequential,
  scaleOrdinal: () => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    unknown: jest.fn().mockReturnThis(),
    copy: jest.fn().mockReturnThis(),
  }),
  scaleBand: () => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    rangeRound: jest.fn().mockReturnThis(),
    round: jest.fn().mockReturnThis(),
    paddingInner: jest.fn().mockReturnThis(),
    paddingOuter: jest.fn().mockReturnThis(),
    padding: jest.fn().mockReturnThis(),
    align: jest.fn().mockReturnThis(),
    bandwidth: jest.fn().mockReturnValue(20),
    step: jest.fn().mockReturnValue(25),
    copy: jest.fn().mockReturnThis(),
  }),

  // Color methods
  interpolateViridis,
  interpolateBlues: interpolateViridis,
  interpolateGreens: interpolateViridis,
  interpolateReds: interpolateViridis,
  schemeCategory10: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"],

  // Selection methods
  select,
  selectAll: select,

  // Event handling
  event: null,
  mouse: jest.fn().mockReturnValue([0, 0]),
  touch: jest.fn().mockReturnValue([0, 0]),
  touches: jest.fn().mockReturnValue([]),

  // Zoom and interaction
  zoom,
  zoomIdentity,
  zoomTransform,

  // Animation
  transition,

  // Formats
  format: jest.fn().mockReturnValue(d => d.toString()),
  timeFormat: jest.fn().mockReturnValue(d => d.toString()),

  // Utilities
  ascending: (a, b) => (a < b ? -1 : a > b ? 1 : 0),
  descending: (a, b) => (a > b ? -1 : a < b ? 1 : 0),
};

// Export both named exports and default export
module.exports = d3;
module.exports.default = d3;

// Named exports
module.exports.extent = extent;
module.exports.scaleSequential = scaleSequential;
module.exports.interpolateViridis = interpolateViridis;
module.exports.scaleLinear = scaleLinear;
module.exports.select = select;
module.exports.zoom = zoom;
module.exports.zoomTransform = zoomTransform;
module.exports.zoomIdentity = zoomIdentity;
