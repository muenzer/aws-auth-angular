(function() {
  'use strict';

  angular
  .module('aws-auth-angular')
  .service('authService', authService);

  authService.$inject = ['lock', 'authManager', 'angularAuth0', 'jwtHelper', '$q', 'awsAuthAngularInfo', '$rootScope', '$state'];
  function authService(lock, authManager, angularAuth0, jwtHelper, $q, awsAuthAngularInfo, $rootScope, $state) {

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
              client_id: awsAuthAngularInfo.AUTH0_CLIENT_ID,
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
