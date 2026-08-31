import 'package:flutter_test/flutter_test.dart';
import 'package:project_unknown_mobile/models/service_extraction.dart';

void main() {
  group('ServiceExtraction Model Parsing Tests', () {
    test('Correctly deserializes AI extraction response payload', () {
      final json = {
        'request_id': 'e305e940-0255-46fb-a0b4-7b6bb822602e',
        'category': 'Electrical',
        'skills': ['Switchboard Repair', 'House Wiring'],
        'urgency': 'emergency',
        'confidence': 0.92,
      };

      final ext = ServiceExtraction.fromJson(json);

      expect(ext.requestId, equals('e305e940-0255-46fb-a0b4-7b6bb822602e'));
      expect(ext.category, equals('Electrical'));
      expect(ext.skills.length, equals(2));
      expect(ext.skills, contains('Switchboard Repair'));
      expect(ext.urgency, equals('emergency'));
      expect(ext.confidence, equals(0.92));
      expect(ext.confidencePercentage, equals(92));
    });
  });
}
