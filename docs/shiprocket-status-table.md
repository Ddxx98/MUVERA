# Shiprocket Webhook Schema & Status Reference

This document defines the verified schema, status mappings, and timestamp rules derived from captured real-payload fixtures (`tests/fixtures/shiprocket-webhook-*.json`).

---

## 1. Top-Level Webhook Payload Schema

| Field Name | Type | Description | Observed Example |
| :--- | :--- | :--- | :--- |
| `awb` | `string` | Courier Air Waybill number | `"143258712345"` |
| `order_id` | `string \| number` | Internal order reference | `"ord_muv_test_001"` |
| `shipment_id` | `number` | Shiprocket numeric shipment ID | `9823412` |
| `current_status` | `string` | High-level status text of the shipment | `"IN TRANSIT"` |
| `current_status_id` | `number` | High-level numeric status ID | `18` |
| `shipment_status` | `string` | Specific carrier status label | `"PICKED UP"` |
| `shipment_status_id` | `number` | Specific carrier numeric status ID | `6` |
| `current_timestamp` | `string` | Timestamp in IST format (`YYYY-MM-DD HH:mm:ss`) | `"2026-10-31 16:45:00"` |
| `courier_name` | `string` | Courier partner name | `"Delhivery Direct"` |
| `courier_id` | `number` | Courier partner ID | `10` |
| `is_return` | `number \| string \| boolean` | `1` / `true` for reverse returns, `0` / `false` for forward orders | `0` or `1` |
| `scans` | `array` | Reverse chronological or chronological list of scans | `[...]` |

### Specialized Context Fields:
- **NDR Payload**:
  - `ndr_status`: string (e.g. `"Customer premise closed / unreachable"`)
  - `attempt`: number (e.g. `1`)
- **Customer Return Payload (`is_return: 1`)**:
  - `return_order_id`: string (e.g. `"RET_MUV_901"`)
  - `qc_status`: `"passed" | "failed"`
  - `qc_image`: string / array of string URLs
  - `qc_failure_reason`: string or `null`

---

## 2. Scan Entry Schema (`scans[]`)

| Field Name | Type | Description | Observed Example |
| :--- | :--- | :--- | :--- |
| `date` | `string` | Scan event timestamp in IST | `"2026-10-31 16:45:00"` |
| `status` | `string` | Scan status label | `"IN TRANSIT"` |
| `activity` | `string` | Detailed description of courier activity | `"Bag dispatched to Mumbai Sorting Center"` |
| `location` | `string` | Location where scan occurred | `"Bengaluru Hub"` |
| `sr-status` | `string \| number` | Shiprocket scan status code | `"18"` |
| `sr-status-label` | `string` | Standardized scan status label | `"IN TRANSIT"` |

---

## 3. Verified Forward Status Mappings (`direction: 'forward'`)

| Raw Status (`current_status`) | Numeric ID | Internal Status | Rank | Type | Notes |
| :--- | :---: | :--- | :---: | :--- | :--- |
| `MANIFEST GENERATED` | 5 | `manifested` | 1 | Transition | AWB allocated, waiting for pickup |
| `MANIFESTED` | 5 | `manifested` | 1 | Transition | Alias for Manifest Generated |
| `AWB ASSIGNED` | 5 | `manifested` | 1 | Transition | Alias for Manifest Generated |
| `READY TO SHIP` | 5 | `manifested` | 1 | Transition | Packed and ready at dark store |
| `PICKUP RESCHEDULED` | 11 | `pickup_exception`| 1 | Transition | Same rank as manifested |
| `PICKUP EXCEPTION` | 11 | `pickup_exception`| 1 | Transition | Same rank as manifested |
| `PICKUP ERROR` | 11 | `pickup_exception`| 1 | Transition | Same rank as manifested |
| `SHIPPED` | 6 | `picked_up` | 2 | Transition | Received at carrier origin hub |
| `PICKED UP` | 6 | `picked_up` | 2 | Transition | Courier received parcel |
| `IN TRANSIT` | 18 | `in_transit` | 3 | Transition | Moving through courier network |
| `REACHED AT DESTINATION HUB`| 18 | `in_transit` | 3 | Transition | Local hub scan |
| `DELAYED` | 19 | `in_transit` | 3 | Informational| Updates location only; status unchanged |
| `OUT FOR DELIVERY` | 17 | `out_for_delivery` | 4 | Transition | Out with delivery executive |
| `UNDELIVERED` | 21 | `ndr_undelivered` | 4 | Transition | Delivery attempted; raises NDR |
| `NDR` / `NDR RAISED` | 21 | `ndr_undelivered` | 4 | Transition | Delivery attempted; raises NDR |
| `DELIVERED` | 7 | `delivered` | 5 | Terminal | Verified delivery; triggers COD verification |
| `RTO INITIATED` | 13 | `rto_initiated` | - | Branch | Carrier initiated return to origin |
| `RTO IN TRANSIT` | 14 | `rto_in_transit` | - | Branch | Returning to dark store |
| `RTO DELIVERED` | 15 | `rto_delivered` | - | Terminal | Received at dark store for inspection |
| `RTO ACKNOWLEDGED` | 15 | `rto_delivered` | - | Informational| Seller acknowledged receipt; same-state |
| `CANCELLED` | 8 | `cancelled` | - | Terminal | Cancelled before shipment |
| `LOST` | 9 | `lost` | - | Terminal | Lost in transit |
| `DAMAGED` | 10 | `damaged` | - | Terminal | Damaged in transit |
| `DESTROYED` | 12 | `destroyed` | - | Terminal | Scrap / destroyed |

---

## 4. Verified Customer Return Mappings (`direction: 'return'`)

| Raw Return Status | Numeric ID | Internal Status | Notes |
| :--- | :---: | :--- | :--- |
| `RETURN INITIATED` | 40 | `created` | Return pickup booked |
| `RETURN SCHEDULED` | 41 | `manifested` | Executive assigned |
| `RETURN PICKED UP` | 42 | `picked_up` | Picked up from customer address with QC |
| `RETURN IN TRANSIT` | 43 | `in_transit` | Moving to warehouse |
| `RETURN OUT FOR DELIVERY` | 44 | `out_for_delivery` | Out for delivery to warehouse |
| `RETURN DELIVERED` | 45 | `delivered` | Received at warehouse; triggers Return received |
| `RETURN CANCELLED` | 48 | `cancelled` | Return cancelled by customer/admin |

---

## 5. Unverified Statuses Policy
Any status label or numeric ID not explicitly matched above is classified as **`unmapped`**:
- The raw event is stored in `webhook_events` with status `unmapped` and `unmappedStatus: "<raw>"`.
- It is **never** dropped or discarded.
- An alert is recorded in `audit_logs` for developer review.

---

## 6. Timezone & Timestamp Rules
- Shiprocket webhook timestamps are formatted in Indian Standard Time (IST): `YYYY-MM-DD HH:mm:ss`.
- If no offset exists (no `+`, `-`, or `Z`), the parser strictly appends `+05:30` before parsing.
- Invalid dates (`Number.isNaN(d.getTime())`) throw an error and cause the raw event to be flagged as `rejected_invalid_date`.
