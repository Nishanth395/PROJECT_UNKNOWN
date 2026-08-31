import 'package:flutter_test/flutter_test.dart';
import 'package:project_unknown_mobile/models/service_request.dart';

void main() {
  group('ServiceRequest Model Parsing Tests', () {
    test('Correctly deserializes from valid backend JSON payload', () {
      final json = {
        'id': 'e305e940-0255-46fb-a0b4-7b6bb822602e',
        'customer_id': 'a0000000-0000-0000-0000-000000000001',
        'description': 'Kitchen PVC water pipe burst and leaking heavily',
        'latitude': 12.9716,
        'longitude': 77.5946,
        'urgency': 'high',
        'status': 'open',
        'extracted_category': 'Plumbing',
        'extracted_skills': ['Pipe Repair', 'Leak Fixing'],
        'address_text': 'Indiranagar, Bengaluru',
        'created_at': '2026-08-31T12:00:00Z',
      };

      final req = ServiceRequest.fromJson(json);

      expect(req.id, equals('e305e940-0255-46fb-a0b4-7b6bb822602e'));
      expect(req.customerId, equals('a0000000-0000-0000-0000-000000000001'));
      expect(req.description, equals('Kitchen PVC water pipe burst and leaking heavily'));
      expect(req.latitude, equals(12.9716));
      expect(req.longitude, equals(77.5946));
      expect(req.urgency, equals('high'));
      expect(req.status, equals('open'));
      expect(req.extractedCategory, equals('Plumbing'));
      expect(req.extractedSkills, contains('Pipe Repair'));
      expect(req.extractedSkills, contains('Leak Fixing'));
      expect(req.isClassified, isTrue);
      expect(req.addressText, equals('Indiranagar, Bengaluru'));
    });

    test('Handles unextracted service request with empty skills', () {
      final json = {
        'id': 'b1000000-0000-0000-0000-000000000001',
        'customer_id': 'a0000000-0000-0000-0000-000000000001',
        'description': 'Fan not turning',
        'urgency': 'normal',
        'status': 'open',
        'extracted_category': null,
        'extracted_skills': [],
      };

      final req = ServiceRequest.fromJson(json);
      expect(req.extractedCategory, isNull);
      expect(req.extractedSkills, isEmpty);
      expect(req.isClassified, isFalse);
    });
  });
}
