import 'package:flutter_test/flutter_test.dart';
import 'package:project_unknown_mobile/models/location_data.dart';

void main() {
  group('LocationDataModel Unit Tests', () {
    test('1 & 2. Valid and invalid latitude checks (-90 to 90)', () {
      expect(LocationDataModel.isValidLatitude(0.0), isTrue);
      expect(LocationDataModel.isValidLatitude(12.9716), isTrue);
      expect(LocationDataModel.isValidLatitude(-90.0), isTrue);
      expect(LocationDataModel.isValidLatitude(90.0), isTrue);

      expect(LocationDataModel.isValidLatitude(90.0001), isFalse);
      expect(LocationDataModel.isValidLatitude(-90.0001), isFalse);
      expect(LocationDataModel.isValidLatitude(double.nan), isFalse);
      expect(LocationDataModel.isValidLatitude(double.infinity), isFalse);
    });

    test('3 & 4. Valid and invalid longitude checks (-180 to 180)', () {
      expect(LocationDataModel.isValidLongitude(0.0), isTrue);
      expect(LocationDataModel.isValidLongitude(77.5946), isTrue);
      expect(LocationDataModel.isValidLongitude(-180.0), isTrue);
      expect(LocationDataModel.isValidLongitude(180.0), isTrue);

      expect(LocationDataModel.isValidLongitude(180.0001), isFalse);
      expect(LocationDataModel.isValidLongitude(-180.0001), isFalse);
      expect(LocationDataModel.isValidLongitude(double.nan), isFalse);
      expect(LocationDataModel.isValidLongitude(double.negativeInfinity), isFalse);
    });

    test('10. Manual location model creation and JSON serialization', () {
      const loc = LocationDataModel(
        latitude: 12.9500,
        longitude: 77.6300,
        accuracy: 10.5,
        addressText: 'Indiranagar, Bengaluru',
        isManual: true,
      );

      expect(loc.isValid, isTrue);
      expect(loc.isManual, isTrue);

      final json = loc.toJson();
      expect(json['latitude'], equals(12.9500));
      expect(json['longitude'], equals(77.6300));
      expect(json['accuracy'], equals(10.5));
      expect(json['address_text'], equals('Indiranagar, Bengaluru'));
      expect(json['is_manual'], isTrue);

      final fromJson = LocationDataModel.fromJson(json);
      expect(fromJson.latitude, equals(12.9500));
      expect(fromJson.longitude, equals(77.6300));
      expect(fromJson.isManual, isTrue);
    });
  });
}
