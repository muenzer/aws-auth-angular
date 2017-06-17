(function() {
  'use strict';

  angular.module('aws-auth-angular',
  [
    'auth0.lock',
    'angular-jwt',
    'auth0.auth0',
    'angular-aws-apig',
    'ui.router',
    'aws-auth-angular-config'
  ]);

}());

(function() {
  'use strict';

  angular.module('aws-auth-angular')
  .config(authConfig)
  .config(awsConfig)
  .run(authServiceConfig)
  .run(stateChange);

  authConfig.$inject = ['lockProvider', 'angularAuth0Provider', 'awsAuthAngularInfo'];
  function authConfig(lockProvider, angularAuth0Provider, awsAuthAngularInfo) {
    var options = {auth: { redirect: false }};
    lockProvider.init({
      clientID: awsAuthAngularInfo.AUTH0_CLIENT_ID,
      domain: awsAuthAngularInfo.AUTH0_DOMAIN,
      options: {
        auth: {
          params: {
            callbackURL: awsAuthAngularInfo.AUTH0_CALLBACK_URL,
            respone: 'token'
          }
        }
      }
    });

    angularAuth0Provider.init({
      clientID: awsAuthAngularInfo.AUTH0_CLIENT_ID,
      domain: awsAuthAngularInfo.AUTH0_DOMAIN
    });
  }

  stateChange.$inject = ['$rootScope', '$state'];
  function stateChange($rootScope, $state) {
    $rootScope.$on('$stateChangeStart', function(e, to, params) {
      localStorage.setItem('redirect_url', $state.href(to.name, params));
    });
  }

  awsConfig.$inject = ['$httpProvider', 'APIGInterceptorProvider', 'awsAuthAngularInfo'];
  function awsConfig($httpProvider, APIGInterceptorProvider, awsAuthAngularInfo) {
    APIGInterceptorProvider.config({
      headers: {},
      region: awsAuthAngularInfo.AWS_REGION,
      service: awsAuthAngularInfo.AWS_SERVICE,
      urlRegex: awsAuthAngularInfo.AWS_URLREGEX
    });

    credentialsGetter.$inject = ['authService'];
    function credentialsGetter(authService) {
      return authService.getAWSToken().then(function (token) {
        var aws =   {
          accessKeyId: token.AccessKeyId,
          secretAccessKey: token.SecretAccessKey,
          sessionToken: token.SessionToken
        };
        return aws;
      }).catch(function () {
      });
    }

    APIGInterceptorProvider.credentialsGetter = credentialsGetter;

    $httpProvider.interceptors.push('APIGInterceptor');
  }

  authServiceConfig.$inject = ['$rootScope', 'authService', 'lock'];
  function authServiceConfig($rootScope, authService, lock) {
    // Put the authService on $rootScope so its methods
    // can be accessed from the nav bar
    $rootScope.authService = authService;

    // Register the authentication listener that is
    // set up in auth.service.js
    authService.registerAuthenticationListener();

    // Register the synchronous hash parser
    lock.interceptHash();

  }

}());

(function() {
  'use strict';

  angular
  .module('aws-auth-angular')
  .service('authService', authService);

  authService.$inject = ['lock', 'authManager', 'angularAuth0', 'jwtHelper', '$q', 'awsAuthAngularInfo', '$rootScope', '$state', '$location'];
  function authService(lock, authManager, angularAuth0, jwtHelper, $q, awsAuthAngularInfo, $rootScope, $state, $location) {

    function login() {
      lock.show();
    }

    function getToken() {
      var deferred = $q.defer();

      var token = localStorage.getItem('id_token');
      if (token && !jwtHelper.isTokenExpired(token)) {
        authManager.authenticate();
        deferred.resolve(token);
      } else {
        // Either show the login page or use the refresh token to get a new idToken
        //deferred.reject('No valid token');
        login();
        deferred.reject('No valid token');
      }

      return deferred.promise;
    }

    // Logging out just requires removing the user's
    // id_token and profile
    function logout() {
      localStorage.removeItem('id_token');
      localStorage.removeItem('AWS.config.credentials');
      authManager.unauthenticate();
      $state.reload();
    }

    // Set up the logic for when a user authenticates
    // This method is called from app.run.js
    function registerAuthenticationListener() {

      lock.on('authenticated', function (authResult) {
        localStorage.setItem('id_token', authResult.idToken);
        authManager.authenticate();

        lock.getProfile(authResult.idToken, function(error, profile) {
          if (!error) {
            localStorage.setItem('profile', JSON.stringify(profile));
            $rootScope.name = profile.name;
            var url = localStorage.getItem('redirect_url').replace('#!','');
            if(url) {
              $location.path(url);
            }
          } else {
            console.log(error);
          }
        });
      });
    }

    function getAWSToken() {
      var token = JSON.parse(localStorage.getItem('AWS.config.credentials'));

      if(token && (new Date(token.Expiration)).getTime() > Date.now()) {
        return $q.when(token);
      } else {
        var d = $q.defer();
        getToken().then(function (idToken) {
          angularAuth0.getDelegationToken(
            {
              client_id: awsAuthAngularInfo.AUTH0_CLIENT_ID,
              id_token: idToken,
              api_type: 'aws'
            }, function(err, result) {
              var awsCreds = result.Credentials; // AWS temp credentials
              localStorage.setItem('AWS.config.credentials', JSON.stringify(awsCreds));
              d.resolve(result.Credentials);
            });
          });
          return d.promise;
        }
      }

      function getProfile() {
        var token = getToken();
        lock.getProfile(token, function(error, profile) {
          if (error) {
            console.log(error);
          }
          return(profile);
        });
      }

      return {
        login: login,
        logout: logout,
        registerAuthenticationListener: registerAuthenticationListener,
        getAWSToken: getAWSToken,
        getToken: getToken,
        getProfile: getProfile
      };
    }

  }());
