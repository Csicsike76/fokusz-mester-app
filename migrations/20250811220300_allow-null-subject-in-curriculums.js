exports.up = (pgm) => {
  pgm.alterColumn('curriculums', 'subject', { notNull: false });
};

exports.down = (pgm) => {
  pgm.alterColumn('curriculums', 'subject', { notNull: true });
};
