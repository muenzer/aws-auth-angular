(function() {
  'use strict';

  angular.module('aws-auth-angular', ['auth0.lock', 'angular-jwt', 'auth0.auth0', 'angular-aws-apig', 'ui.router']);

}());

(function() {
  'use strict';

  angular.module('aws-auth-angular')
  .config(authConfig)
  .config(awsConfig)
  .constant('accountInfo', {
    AUTH0_CLIENT_ID: AUTH0_CLIENT_ID,
    AUTH0_DOMAIN: AUTH0_DOMAIN,
    AUTH0_CALLBACK_URL: AUTH0_CALLBACK_URL
  })
  .run(authServiceConfig);

  authConfig.$inject = ['lockProvider', 'angularAuth0Provider', 'accountInfo'];
  function authConfig(lockProvider, angularAuth0Provider, accountInfo) {
    var options = {auth: { redirect: false }};
    lockProvider.init({
      clientID: accountInfo.AUTH0_CLIENT_ID,
      domain: accountInfo.AUTH0_DOMAIN,
      options: {
        auth: {
          params: {
            callbackURL: accountInfo.AUTH0_CALLBACK_URL,
            respone: 'token'
          }
        }
      }
    });

    angularAuth0Provider.init({
      clientID: accountInfo.AUTH0_CLIENT_ID,
      domain: accountInfo.AUTH0_DOMAIN
    });
  }

  awsConfig.$inject = ['$httpProvider', 'APIGInterceptorProvider'];
  function awsConfig($httpProvider, APIGInterceptorProvider) {
    APIGInterceptorProvider.config({
      headers: {},
      region: 'eu-central-1',
      service: 'execute-api',
      urlRegex: 'amazonaws.com/.*/admin'
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
        //authService.login();
      });
    }

    APIGInterceptorProvider.credentialsGetter = credentialsGetter;

    $httpProvider.interceptors.push('APIGInterceptor');
  }

  // stateChange.$inject = ['$rootScope', '$state', 'authService'];
  // function stateChange($rootScope, $state, authService) {
  //   $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
  //     if (toState.name !== 'login' && toState.name.includes('admin')){
  //       authService.getToken().catch(function () {
  //         // User isn’t authenticated
  //         $state.transitionTo('login');
  //         event.preventDefault();
  //       });
  //     }
  //   });
  //
  // }

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

  //localStorage.removeItem('AWS.config.credentials');
}

}());

(function() {
  'use strict';

  angular
  .module('aws-auth-angular')
  .service('authService', authService);

  authService.$inject = ['lock', 'authManager', 'angularAuth0', 'jwtHelper', '$q', 'accountInfo', '$rootScope', '$state'];
  function authService(lock, authManager, angularAuth0, jwtHelper, $q, accountInfo, $rootScope, $state) {

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
      // lock.on('show', function () {
      //   localStorage.removeItem('AWS.config.credentials');
      // });

      lock.on('authenticated', function (authResult) {
        localStorage.setItem('id_token', authResult.idToken);
        authManager.authenticate();

        lock.getProfile(authResult.idToken, function(error, profile) {
          if (!error) {
            localStorage.setItem('profile', JSON.stringify(profile));
            $rootScope.name = profile.name;
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
          /* jshint -W106 */
          angularAuth0.getDelegationToken(
            {
              client_id: accountInfo.AUTH0_CLIENT_ID,
              id_token: idToken,
              api_type: 'aws'
            }, function(err, result) {
              var awsCreds = result.Credentials; // AWS temp credentials
              localStorage.setItem('AWS.config.credentials', JSON.stringify(awsCreds));
              d.resolve(result.Credentials);
            });
            /* jshint +W106 */
          });
          return d.promise;
        }
      }

      function getProfile() {
        var token = getToken();
        lock.getProfile(authResult.idToken, function(error, profile) {
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
