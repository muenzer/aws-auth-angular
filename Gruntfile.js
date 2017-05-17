module.exports = function (grunt) {
  'use strict';

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    bower_concat: {
      all: {
        dest: {
          'js': 'build/_bower.js',
        },
        exclude: [
          'angular',
          'angular-ui-router',
          'angular-mocks'
        ]
      }
    },
    concat: {
      dist: {
        src: ['auth/auth.module.js', 'auth/*.*'],
        dest: 'aws-auth-angular.js',
      },
    },
  });

  grunt.registerTask('build', [
    'concat'
    ]);
};
