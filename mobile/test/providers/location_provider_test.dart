import 'package:flutter_test/flutter_test.dart';
import 'package:project_unknown_mobile/providers/location_provider.dart';

void main() {
  group('LocationProvider Unit Tests', () {
    late LocationProvider provider;

    setUp(() {
      provider = LocationProvider();
    });

    test('Initial state provides valid fallback location', () {
      expect(provider.hasLocation, isTrue);
      expect(provider.currentLocation, isNotNull);
      expect(provider.currentLocation!.latitude, equals(12.9716));
      expect(provider.currentLocation!.longitude, equals(77.5946));
      expect(provider.errorMessage, isNull);
    });

    test('10 & 11. setManualLocation updates coordinates correctly', () {
      provider.setManualLocation(12.9500, 77.6300, addressText: 'Domlur, Bengaluru');

      expect(provider.hasLocation, isTrue);
      expect(provider.currentLocation!.latitude, equals(12.9500));
      expect(provider.currentLocation!.longitude, equals(77.6300));
      expect(provider.currentLocation!.addressText, equals('Domlur, Bengaluru'));
      expect(provider.currentLocation!.isManual, isTrue);
      expect(provider.errorMessage, isNull);
    });

    test('2. setManualLocation rejects invalid latitude (>90)', () {
      provider.setManualLocation(95.0, 77.6300);

      expect(provider.errorMessage, contains('Invalid latitude'));
    });

    test('4. setManualLocation rejects invalid longitude (>180)', () {
      provider.setManualLocation(12.9500, 190.0);

      expect(provider.errorMessage, contains('Invalid longitude'));
    });

    test('useDemoBengaluruLocation resets to default coordinates', () {
      provider.setManualLocation(28.6139, 77.2090, addressText: 'New Delhi');
      expect(provider.currentLocation!.latitude, equals(28.6139));

      provider.useDemoBengaluruLocation();
      expect(provider.currentLocation!.latitude, equals(12.9716));
      expect(provider.currentLocation!.longitude, equals(77.5946));
    });
  });
}
