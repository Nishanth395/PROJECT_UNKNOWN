import 'package:flutter_test/flutter_test.dart';
import 'package:project_unknown_mobile/core/network/api_exceptions.dart';

void main() {
  group('ApiException Status Code Factory Tests', () {
    test('400 BAD_REQUEST mapping', () {
      final exc = ApiException.fromStatusCode(400, detail: 'Invalid input', errorCode: 'BAD_REQUEST');
      expect(exc.statusCode, equals(400));
      expect(exc.errorCode, equals('BAD_REQUEST'));
      expect(exc.message, equals('Invalid input'));
    });

    test('401 UNAUTHORIZED user friendly message', () {
      final exc = ApiException.fromStatusCode(401);
      expect(exc.statusCode, equals(401));
      expect(exc.message, contains('session has expired'));
    });

    test('403 FORBIDDEN message', () {
      final exc = ApiException.fromStatusCode(403);
      expect(exc.statusCode, equals(403));
      expect(exc.message, contains('permission'));
    });

    test('404 NOT_FOUND mapping', () {
      final exc = ApiException.fromStatusCode(404, detail: 'Service request not found', errorCode: 'REQUEST_NOT_FOUND');
      expect(exc.statusCode, equals(404));
      expect(exc.errorCode, equals('REQUEST_NOT_FOUND'));
      expect(exc.message, equals('Service request not found'));
    });

    test('Network and Timeout exceptions', () {
      final netExc = ApiException.networkError();
      expect(netExc.errorCode, equals('NETWORK_ERROR'));

      final timeExc = ApiException.timeout();
      expect(timeExc.errorCode, equals('TIMEOUT_ERROR'));
    });
  });
}
