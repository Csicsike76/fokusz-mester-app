exports.up = (pgm) => {
  pgm.alterColumn('curriculums', 'grade', { notNull: false });
};

exports.down = (pgm) => {
  pgm.alterColumn('curriculums', 'grade', { notNull: true });
};
