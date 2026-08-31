import 'package:flutter_test/flutter_test.dart';
import 'package:project_unknown_mobile/services/location_service.dart';

void main() {
  group('LocationService Exception & Demo Location Tests', () {
    final locationService = LocationService();

    test('5. Permission denied exception has correct code and message', () {
      const exc = LocationServiceException(
        message: 'Location permission was denied.',
        code: 'PERMISSION_DENIED',
        isPermanent: false,
      );

      expect(exc.code, equals('PERMISSION_DENIED'));
      expect(exc.isPermanent, isFalse);
      expect(exc.toString(), contains('denied'));
    });

    test('6. Permission permanently denied exception flags isPermanent', () {
      const exc = LocationServiceException(
        message: 'Location permissions are permanently denied.',
        code: 'PERMISSION_DENIED_FOREVER',
        isPermanent: true,
      );

      expect(exc.code, equals('PERMISSION_DENIED_FOREVER'));
      expect(exc.isPermanent, isTrue);
    });

    test('7. Location services disabled exception', () {
      const exc = LocationServiceException(
        message: 'Location services are turned off on your device.',
        code: 'SERVICE_DISABLED',
      );

      expect(exc.code, equals('SERVICE_DISABLED'));
    });

    test('9. Location timeout exception', () {
      const exc = LocationServiceException(
        message: 'GPS request timed out.',
        code: 'TIMEOUT',
      );

      expect(exc.code, equals('TIMEOUT'));
    });

    test('8 & 12. Demo Bengaluru location returns valid non-hardcoded model', () {
      final demoLoc = locationService.getDemoBengaluruLocation();

      expect(demoLoc.isValid, isTrue);
      expect(demoLoc.latitude, equals(12.9716));
      expect(demoLoc.longitude, equals(77.5946));
      expect(demoLoc.isManual, isTrue);
    });
  });
}
