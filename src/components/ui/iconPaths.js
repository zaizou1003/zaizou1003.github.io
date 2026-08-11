export const iconDefinitions = Object.freeze({
  email: Object.freeze({
    viewBox: '0 0 24 24',
    paths: Object.freeze([
      'M3.75,5.75h16.5v12.5H3.75z',
      'm4.25,7,8,6,8-6',
    ]),
  }),
  github: Object.freeze({
    viewBox: '0 0 24 24',
    paths: Object.freeze([
      'M12,2.75a9.25,9.25,0,0,0-2.93,18.03c.46.08.63-.2.63-.45v-1.78c-2.57.56-3.11-1.09-3.11-1.09-.42-1.07-1.03-1.35-1.03-1.35-.84-.58.06-.57.06-.57.93.07,1.42.96,1.42.96.83,1.42,2.17,1.01,2.7.77.08-.6.32-1.01.59-1.24-2.05-.23-4.21-1.03-4.21-4.57,0-1.01.36-1.84.95-2.49-.1-.23-.41-1.18.09-2.45,0,0,.78-.25,2.54.95A8.8,8.8,0,0,1,12,7.16a8.8,8.8,0,0,1,2.31.31c1.76-1.2,2.54-.95,2.54-.95.5,1.27.19,2.22.09,2.45.59.65.95,1.48.95,2.49,0,3.55-2.16,4.33-4.22,4.56.33.29.63.85.63,1.72v2.59c0,.25.17.54.64.45A9.25,9.25,0,0,0,12,2.75Z',
    ]),
    fill: true,
  }),
  linkedin: Object.freeze({
    viewBox: '0 0 24 24',
    paths: Object.freeze([
      'M5.5,8.5v10',
      'M5.5,5.5v.01',
      'M10,18.5v-10',
      'M10,13a4.5,4.5,0,0,1,9,0v5.5',
    ]),
  }),
  arrow: Object.freeze({
    viewBox: '0 0 24 24',
    paths: Object.freeze(['M5,12h14', 'M14,7l5,5-5,5']),
  }),
  external: Object.freeze({
    viewBox: '0 0 24 24',
    paths: Object.freeze(['M14,5h5v5', 'M19,5l-9,9', 'M19,14v5H5V5h5']),
  }),
});

export const iconNames = Object.freeze(Object.keys(iconDefinitions));
