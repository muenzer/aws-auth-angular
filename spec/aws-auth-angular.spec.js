describe('AuthService', function() {
  beforeEach(module('aws-auth-angular'));

  var $service;

  beforeEach(inject(function(_authService_){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $service = _authService_;
  }));

  describe('exists', function() {
    it('service is defined', function() {
      expect($service).toBeDefined();
    });
  });
});
