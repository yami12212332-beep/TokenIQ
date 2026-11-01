-- ============================================================================
-- TokenIQ telemetry seed for tokeniq_db
-- Matches the schema created by db/simple.sql.
--
-- Populates (3 tables with demo data):
--   copilot_usage_user_detail
--   copilot_user_count_summary
--   copilot_user_count_trend
-- Empties (tables exist but the demo dataset has no rows):
--   claude_user_usage_report
--   claude_user_cost_report
--
-- Usage:
--   psql -U postgres -d tokeniq_db -f db/seed.sql
--
-- Safe to re-run: the TRUNCATE below clears the tables first.
-- Regenerated from a live DB with:
--   pg_dump -a --inserts --rows-per-insert=50 --no-owner --no-privileges \
--     -t copilot_usage_user_detail -t copilot_user_count_summary \
--     -t copilot_user_count_trend -t claude_user_usage_report \
--     -t claude_user_cost_report tokeniq_db
-- ============================================================================

TRUNCATE TABLE
    copilot_usage_user_detail,
    copilot_user_count_summary,
    copilot_user_count_trend,
    claude_user_usage_report,
    claude_user_cost_report
RESTART IDENTITY;

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Data for Name: claude_user_cost_report; Type: TABLE DATA; Schema: public; Owner: -



-- Data for Name: claude_user_usage_report; Type: TABLE DATA; Schema: public; Owner: -



-- Data for Name: copilot_usage_user_detail; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.copilot_usage_user_detail VALUES
	(1, '2026-08-28', 'anita.deshmukh@contoso.com', 'Anita Deshmukh', '2026-08-27', '2026-08-27', NULL, '2026-08-27', NULL, NULL, '2026-08-10', NULL, NULL, 'D30', 109, 44, 6, 12, '2026-08-18', '2026-08-03', '2026-08-27', '2026-08-25', '2026-08-28'),
	(2, '2026-08-28', 'vikram.rao@contoso.com', 'Vikram Rao', '2026-08-27', '2026-08-27', '2026-08-21', '2026-08-27', '2026-08-27', '2026-08-26', '2026-08-26', '2026-08-20', NULL, 'D30', 558, 233, 39, 22, '2026-08-25', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-28'),
	(3, '2026-08-28', 'priya.nambiar@contoso.com', 'Priya Nambiar', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-26', '2026-08-25', '2026-08-14', '2026-08-24', 'D30', 622, 257, 45, 24, '2026-08-26', '2026-08-26', '2026-08-27', '2026-08-26', '2026-08-28'),
	(4, '2026-08-28', 'arjun.mehta@contoso.com', 'Arjun Mehta', '2026-08-27', '2026-08-27', '2026-08-21', NULL, NULL, '2026-08-26', NULL, NULL, NULL, 'D30', 126, 39, 1, 19, '2026-08-24', '2026-08-27', '2026-08-27', '2026-08-26', '2026-08-28'),
	(5, '2026-08-28', 'neha.kapoor@contoso.com', 'Neha Kapoor', '2026-08-27', '2026-08-27', '2026-08-27', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 89, 40, 0, 13, NULL, '2026-08-06', '2026-08-27', NULL, '2026-08-28'),
	(6, '2026-08-28', 'rohan.iyer@contoso.com', 'Rohan Iyer', '2026-08-26', '2026-08-26', NULL, NULL, '2026-08-26', '2026-08-21', NULL, NULL, NULL, 'D30', 109, 36, 1, 11, '2026-08-14', NULL, '2026-08-26', '2026-08-21', '2026-08-28'),
	(7, '2026-08-28', 'sana.qureshi@contoso.com', 'Sana Qureshi', '2026-08-21', '2026-08-21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 12, 5, 0, 4, NULL, NULL, '2026-08-21', NULL, '2026-08-28'),
	(8, '2026-08-28', 'tom.becker@contoso.com', 'Tom Becker', '2026-08-20', '2026-08-20', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 2, 2, 0, 2, NULL, NULL, '2026-08-20', NULL, '2026-08-28'),
	(9, '2026-08-28', 'divya.menon@contoso.com', 'Divya Menon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-08-28'),
	(10, '2026-08-28', 'luis.ortega@contoso.com', 'Luis Ortega', '2026-08-14', '2026-08-14', NULL, '2026-08-14', '2026-08-14', NULL, NULL, NULL, NULL, 'D30', 60, 23, 4, 8, NULL, '2026-08-14', '2026-08-14', '2026-08-13', '2026-08-28'),
	(11, '2026-08-28', 'meera.pillai@contoso.com', 'Meera Pillai', '2026-08-27', '2026-08-27', NULL, NULL, '2026-08-21', '2026-08-27', NULL, NULL, NULL, 'D30', 102, 49, 3, 13, '2026-08-26', '2026-08-27', '2026-08-27', '2026-08-14', '2026-08-28'),
	(12, '2026-08-28', 'karan.malhotra@contoso.com', 'Karan Malhotra', '2026-08-27', '2026-08-27', '2026-08-27', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 131, 55, 4, 16, '2026-08-04', '2026-08-13', '2026-08-27', '2026-08-20', '2026-08-28'),
	(13, '2026-08-28', 'jessica.lee@contoso.com', 'Jessica Lee', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-25', '2026-08-27', '2026-08-25', '2026-08-27', '2026-08-07', NULL, 'D30', 612, 292, 43, 21, '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-28'),
	(14, '2026-08-28', 'ishaan.verma@contoso.com', 'Ishaan Verma', '2026-08-27', '2026-08-24', NULL, '2026-08-27', NULL, NULL, '2026-08-27', NULL, NULL, 'D30', 95, 34, 1, 12, NULL, '2026-08-24', '2026-08-24', '2026-07-30', '2026-08-28'),
	(15, '2026-08-28', 'olivia.grant@contoso.com', 'Olivia Grant', '2026-08-27', '2026-08-27', '2026-08-27', NULL, NULL, NULL, '2026-08-21', NULL, NULL, 'D30', 113, 52, 1, 16, '2026-08-13', '2026-08-27', '2026-08-27', '2026-08-19', '2026-08-28'),
	(16, '2026-08-28', 'aarav.shah@contoso.com', 'Aarav Shah', '2026-08-21', '2026-08-21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 20, 11, 0, 6, NULL, NULL, '2026-08-21', NULL, '2026-08-28'),
	(17, '2026-08-28', 'maya.krishnan@contoso.com', 'Maya Krishnan', '2026-08-14', '2026-08-14', '2026-07-30', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 6, 4, 0, 4, NULL, NULL, '2026-08-14', NULL, '2026-08-28'),
	(18, '2026-08-28', 'daniel.foster@contoso.com', 'Daniel Foster', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-08-28'),
	(19, '2026-08-28', 'michael.turner@contoso.com', 'Michael Turner', '2026-08-27', '2026-08-27', NULL, NULL, '2026-08-12', '2026-08-24', NULL, NULL, NULL, 'D30', 87, 40, 1, 13, '2026-08-27', '2026-08-24', '2026-08-27', '2026-07-31', '2026-08-28'),
	(20, '2026-08-28', 'ananya.das@contoso.com', 'Ananya Das', '2026-08-27', '2026-08-24', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-24', '2026-08-27', '2026-08-27', NULL, 'D30', 611, 237, 30, 21, '2026-08-26', '2026-08-27', '2026-08-24', '2026-08-24', '2026-08-28'),
	(21, '2026-08-28', 'mark.robinson@contoso.com', 'Mark Robinson', '2026-08-27', '2026-08-25', '2026-08-27', '2026-08-25', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-18', NULL, 'D30', 514, 246, 22, 20, '2026-08-27', '2026-08-24', '2026-08-25', '2026-08-25', '2026-08-28'),
	(22, '2026-08-28', 'varun.chopra@contoso.com', 'Varun Chopra', '2026-08-27', '2026-08-27', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-22', '2026-08-26', '2026-08-25', '2026-08-13', 'D30', 520, 223, 21, 23, '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-26', '2026-08-28'),
	(23, '2026-08-28', 'emily.carter@contoso.com', 'Emily Carter', '2026-08-27', '2026-08-27', NULL, '2026-08-27', NULL, '2026-08-27', NULL, NULL, NULL, 'D30', 102, 44, 2, 13, NULL, '2026-08-19', '2026-08-27', '2026-08-12', '2026-08-28'),
	(24, '2026-08-28', 'rakesh.joshi@contoso.com', 'Rakesh Joshi', '2026-08-27', '2026-08-27', NULL, '2026-08-27', NULL, NULL, NULL, NULL, NULL, 'D30', 84, 37, 2, 10, '2026-07-31', '2026-08-05', '2026-08-27', '2026-08-24', '2026-08-28'),
	(25, '2026-08-28', 'nina.patel@contoso.com', 'Nina Patel', '2026-08-27', '2026-08-27', NULL, '2026-08-27', '2026-08-27', NULL, NULL, NULL, NULL, 'D30', 99, 38, 2, 14, '2026-08-13', '2026-08-04', '2026-08-27', '2026-08-12', '2026-08-28'),
	(26, '2026-08-28', 'chris.walker@contoso.com', 'Chris Walker', '2026-08-27', '2026-08-27', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 21, 10, 0, 5, NULL, NULL, '2026-08-27', NULL, '2026-08-28'),
	(27, '2026-08-28', 'pooja.reddy@contoso.com', 'Pooja Reddy', '2026-08-24', '2026-08-24', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 8, 5, 0, 5, NULL, NULL, '2026-08-24', NULL, '2026-08-28'),
	(28, '2026-08-28', 'brandon.hughes@contoso.com', 'Brandon Hughes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-08-28'),
	(29, '2026-08-28', 'kavita.sharma@contoso.com', 'Kavita Sharma', '2026-08-13', '2026-08-13', NULL, '2026-08-13', NULL, '2026-08-13', NULL, NULL, NULL, 'D30', 71, 31, 3, 9, '2026-08-10', '2026-08-05', '2026-08-13', '2026-08-11', '2026-08-28'),
	(30, '2026-08-28', 'sophia.laurent@contoso.com', 'Sophia Laurent', '2026-08-26', '2026-08-26', NULL, NULL, NULL, NULL, '2026-08-25', NULL, NULL, 'D30', 92, 39, 4, 12, '2026-07-29', '2026-08-25', '2026-08-26', '2026-08-25', '2026-08-28'),
	(31, '2026-08-28', 'natalie.brooks@contoso.com', 'Natalie Brooks', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-27', '2026-08-24', '2026-08-26', '2026-08-03', 'D30', 664, 290, 44, 25, '2026-08-19', '2026-08-20', '2026-08-27', '2026-08-25', '2026-08-28'),
	(32, '2026-08-28', 'rahul.bansal@contoso.com', 'Rahul Bansal', '2026-08-27', '2026-08-25', NULL, NULL, '2026-08-27', NULL, '2026-08-27', NULL, NULL, 'D30', 106, 35, 0, 13, '2026-08-19', '2026-08-13', '2026-08-25', NULL, '2026-08-28'),
	(33, '2026-08-28', 'hannah.cole@contoso.com', 'Hannah Cole', '2026-08-26', '2026-08-26', '2026-08-26', NULL, NULL, NULL, '2026-08-19', NULL, NULL, 'D30', 116, 41, 2, 13, '2026-08-03', '2026-08-24', '2026-08-26', '2026-08-24', '2026-08-28'),
	(34, '2026-08-28', 'imran.sheikh@contoso.com', 'Imran Sheikh', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-08-28'),
	(35, '2026-08-28', 'grace.kim@contoso.com', 'Grace Kim', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-08-28'),
	(36, '2026-08-28', 'rahul.nair@contoso.com', 'Rahul Nair', '2026-08-27', '2026-08-27', '2026-08-26', '2026-08-24', NULL, NULL, NULL, NULL, NULL, 'D30', 155, 59, 5, 17, '2026-08-12', '2026-08-11', '2026-08-27', '2026-08-27', '2026-08-28'),
	(37, '2026-08-28', 'siddharth.rane@contoso.com', 'Siddharth Rane', '2026-08-27', '2026-08-27', '2026-08-17', NULL, NULL, NULL, '2026-08-19', NULL, NULL, 'D30', 109, 56, 2, 13, '2026-08-19', NULL, '2026-08-27', '2026-07-31', '2026-08-28'),
	(38, '2026-08-28', 'amanda.price@contoso.com', 'Amanda Price', '2026-08-26', '2026-08-26', '2026-08-21', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 115, 49, 5, 14, '2026-08-19', '2026-07-31', '2026-08-26', '2026-08-26', '2026-08-28'),
	(39, '2026-08-28', 'lakshmi.narayan@contoso.com', 'Lakshmi Narayan', '2026-08-25', '2026-08-25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 24, 12, 0, 7, NULL, NULL, '2026-08-25', NULL, '2026-08-28'),
	(40, '2026-08-28', 'jordan.blake@contoso.com', 'Jordan Blake', '2026-08-27', '2026-08-27', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 10, 5, 0, 3, NULL, NULL, '2026-08-27', NULL, '2026-08-28'),
	(41, '2026-08-28', 'fatima.noor@contoso.com', 'Fatima Noor', '2026-08-19', '2026-08-19', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 9, 5, 0, 4, NULL, NULL, '2026-08-19', NULL, '2026-08-28'),
	(42, '2026-08-28', 'greg.dawson@contoso.com', 'Greg Dawson', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-08-28'),
	(43, '2026-08-28', 'ritu.saxena@contoso.com', 'Ritu Saxena', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-08-28'),
	(44, '2026-08-28', 'elena.rossi@contoso.com', 'Elena Rossi', '2026-08-04', '2026-08-04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 9, 4, 0, 2, NULL, NULL, '2026-08-04', NULL, '2026-08-28'),
	(45, '2026-08-28', 'isha.banerjee@contoso.com', 'Isha Banerjee', '2026-08-27', '2026-08-27', NULL, NULL, '2026-08-25', '2026-08-25', NULL, NULL, NULL, 'D30', 174, 74, 8, 18, '2026-08-04', '2026-08-17', '2026-08-27', '2026-08-24', '2026-08-28'),
	(46, '2026-08-28', 'pranav.kumar@contoso.com', 'Pranav Kumar', '2026-08-27', '2026-08-27', NULL, NULL, NULL, '2026-08-27', NULL, NULL, NULL, 'D30', 110, 37, 0, 15, '2026-08-27', '2026-08-19', '2026-08-27', NULL, '2026-08-28'),
	(47, '2026-08-28', 'claire.dubois@contoso.com', 'Claire Dubois', '2026-08-20', '2026-08-20', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 6, 3, 0, 3, NULL, NULL, '2026-08-20', NULL, '2026-08-28'),
	(48, '2026-08-28', 'anil.gupta@contoso.com', 'Anil Gupta', '2026-08-27', '2026-08-27', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 14, 8, 0, 4, '2026-08-25', NULL, '2026-08-27', NULL, '2026-08-28'),
	(49, '2026-08-28', 'rebecca.stone@contoso.com', 'Rebecca Stone', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-08-28'),
	(50, '2026-08-28', 'dev.malik@contoso.com', 'Dev Malik', '2026-08-27', '2026-08-27', NULL, '2026-08-27', NULL, '2026-08-27', NULL, NULL, NULL, 'D30', 112, 51, 4, 12, '2026-08-24', '2026-08-14', '2026-08-27', '2026-08-18', '2026-08-28');
INSERT INTO public.copilot_usage_user_detail VALUES
	(51, '2026-08-28', 'julia.weber@contoso.com', 'Julia Weber', '2026-08-27', '2026-08-27', NULL, '2026-08-18', NULL, NULL, '2026-08-26', NULL, NULL, 'D30', 125, 54, 3, 12, '2026-07-31', '2026-07-31', '2026-08-27', '2026-08-07', '2026-08-28'),
	(52, '2026-09-25', 'anita.deshmukh@contoso.com', 'Anita Deshmukh', '2026-09-24', '2026-09-24', NULL, '2026-09-14', NULL, NULL, '2026-09-24', NULL, NULL, 'D30', 138, 59, 2, 14, '2026-08-31', '2026-09-21', '2026-09-24', '2026-09-09', '2026-09-25'),
	(53, '2026-09-25', 'vikram.rao@contoso.com', 'Vikram Rao', '2026-09-24', '2026-09-24', '2026-09-23', '2026-09-23', '2026-09-23', '2026-09-21', '2026-09-24', '2026-09-23', '2026-09-07', 'D30', 679, 308, 54, 23, '2026-09-24', '2026-09-23', '2026-09-24', '2026-09-24', '2026-09-25'),
	(54, '2026-09-25', 'priya.nambiar@contoso.com', 'Priya Nambiar', '2026-09-24', '2026-09-24', '2026-09-24', '2026-09-24', '2026-09-22', '2026-09-22', '2026-09-24', '2026-09-18', '2026-09-01', 'D30', 592, 264, 35, 24, '2026-09-24', '2026-09-21', '2026-09-24', '2026-09-24', '2026-09-25'),
	(55, '2026-09-25', 'arjun.mehta@contoso.com', 'Arjun Mehta', '2026-09-24', '2026-09-24', '2026-09-24', NULL, NULL, '2026-09-24', NULL, NULL, NULL, 'D30', 129, 62, 5, 14, '2026-08-24', '2026-09-16', '2026-09-24', '2026-09-22', '2026-09-25'),
	(112, '2026-10-23', 'divya.menon@contoso.com', 'Divya Menon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-10-23'),
	(56, '2026-09-25', 'neha.kapoor@contoso.com', 'Neha Kapoor', '2026-09-24', '2026-09-24', '2026-09-22', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 124, 58, 2, 16, '2026-09-22', '2026-09-17', '2026-09-24', '2026-09-10', '2026-09-25'),
	(57, '2026-09-25', 'rohan.iyer@contoso.com', 'Rohan Iyer', '2026-09-24', '2026-09-24', NULL, NULL, '2026-09-24', '2026-09-22', NULL, NULL, NULL, 'D30', 132, 58, 3, 17, '2026-09-22', NULL, '2026-09-24', '2026-09-10', '2026-09-25'),
	(58, '2026-09-25', 'sana.qureshi@contoso.com', 'Sana Qureshi', '2026-09-14', '2026-09-14', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 12, 7, 0, 4, NULL, NULL, '2026-09-14', NULL, '2026-09-25'),
	(59, '2026-09-25', 'tom.becker@contoso.com', 'Tom Becker', '2026-09-17', '2026-09-17', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 12, 5, 0, 4, NULL, NULL, '2026-09-17', NULL, '2026-09-25'),
	(60, '2026-09-25', 'divya.menon@contoso.com', 'Divya Menon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-09-25'),
	(61, '2026-09-25', 'luis.ortega@contoso.com', 'Luis Ortega', '2026-08-14', '2026-08-14', NULL, '2026-08-14', '2026-08-14', NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, '2026-08-14', '2026-08-14', '2026-08-13', '2026-09-25'),
	(62, '2026-09-25', 'meera.pillai@contoso.com', 'Meera Pillai', '2026-09-24', '2026-09-24', NULL, NULL, '2026-09-18', '2026-09-24', NULL, NULL, NULL, 'D30', 138, 53, 4, 17, '2026-08-26', '2026-09-22', '2026-09-24', '2026-09-21', '2026-09-25'),
	(63, '2026-09-25', 'karan.malhotra@contoso.com', 'Karan Malhotra', '2026-09-21', '2026-09-21', '2026-09-19', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 82, 33, 2, 10, '2026-09-16', '2026-09-14', '2026-09-21', '2026-09-09', '2026-09-25'),
	(64, '2026-09-25', 'jessica.lee@contoso.com', 'Jessica Lee', '2026-09-24', '2026-09-24', '2026-09-23', '2026-09-23', '2026-09-24', '2026-09-23', '2026-09-24', '2026-09-16', '2026-09-21', 'D30', 524, 247, 25, 23, '2026-09-24', '2026-09-24', '2026-09-24', '2026-09-23', '2026-09-25'),
	(65, '2026-09-25', 'ishaan.verma@contoso.com', 'Ishaan Verma', '2026-09-23', '2026-09-23', NULL, '2026-09-16', NULL, NULL, '2026-09-23', NULL, NULL, 'D30', 92, 41, 1, 11, '2026-09-23', '2026-09-10', '2026-09-23', '2026-09-01', '2026-09-25'),
	(66, '2026-09-25', 'olivia.grant@contoso.com', 'Olivia Grant', '2026-09-22', '2026-09-22', '2026-09-21', NULL, NULL, NULL, '2026-09-18', NULL, NULL, 'D30', 122, 53, 2, 15, '2026-09-17', '2026-09-16', '2026-09-22', '2026-09-21', '2026-09-25'),
	(67, '2026-09-25', 'aarav.shah@contoso.com', 'Aarav Shah', '2026-09-21', '2026-09-21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 11, 4, 0, 4, NULL, NULL, '2026-09-21', NULL, '2026-09-25'),
	(68, '2026-09-25', 'maya.krishnan@contoso.com', 'Maya Krishnan', '2026-09-23', '2026-09-23', '2026-07-30', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 7, 3, 0, 2, NULL, NULL, '2026-09-23', NULL, '2026-09-25'),
	(69, '2026-09-25', 'daniel.foster@contoso.com', 'Daniel Foster', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-09-25'),
	(70, '2026-09-25', 'michael.turner@contoso.com', 'Michael Turner', '2026-09-24', '2026-09-24', NULL, NULL, '2026-09-07', '2026-09-24', NULL, NULL, NULL, 'D30', 161, 76, 5, 17, '2026-09-17', '2026-09-23', '2026-09-24', '2026-09-17', '2026-09-25'),
	(71, '2026-09-25', 'ananya.das@contoso.com', 'Ananya Das', '2026-09-24', '2026-09-23', '2026-09-21', '2026-09-24', '2026-09-23', '2026-09-23', '2026-09-24', '2026-09-10', '2026-09-17', 'D30', 586, 221, 37, 21, '2026-09-22', '2026-09-21', '2026-09-23', '2026-09-23', '2026-09-25'),
	(72, '2026-09-25', 'mark.robinson@contoso.com', 'Mark Robinson', '2026-09-24', '2026-09-24', '2026-09-24', '2026-09-17', '2026-09-18', '2026-09-17', '2026-09-22', '2026-09-10', NULL, 'D30', 541, 155, 30, 21, '2026-09-15', '2026-09-22', '2026-09-24', '2026-09-24', '2026-09-25'),
	(73, '2026-09-25', 'varun.chopra@contoso.com', 'Varun Chopra', '2026-09-24', '2026-09-24', '2026-09-23', '2026-09-21', '2026-09-18', '2026-09-24', '2026-09-24', '2026-09-18', '2026-08-13', 'D30', 528, 234, 20, 22, '2026-09-21', '2026-09-24', '2026-09-24', '2026-09-20', '2026-09-25'),
	(74, '2026-09-25', 'emily.carter@contoso.com', 'Emily Carter', '2026-09-23', '2026-09-23', NULL, '2026-09-18', NULL, '2026-09-22', NULL, NULL, NULL, 'D30', 128, 58, 2, 15, '2026-09-16', '2026-09-23', '2026-09-23', '2026-09-18', '2026-09-25'),
	(75, '2026-09-25', 'rakesh.joshi@contoso.com', 'Rakesh Joshi', '2026-09-24', '2026-09-24', NULL, '2026-09-03', NULL, NULL, NULL, NULL, NULL, 'D30', 127, 54, 2, 13, '2026-09-15', '2026-09-01', '2026-09-24', '2026-09-22', '2026-09-25'),
	(76, '2026-09-25', 'nina.patel@contoso.com', 'Nina Patel', '2026-09-24', '2026-09-24', NULL, '2026-09-24', '2026-09-24', NULL, NULL, NULL, NULL, 'D30', 150, 61, 5, 14, '2026-09-16', '2026-09-10', '2026-09-24', '2026-09-16', '2026-09-25'),
	(77, '2026-09-25', 'chris.walker@contoso.com', 'Chris Walker', '2026-09-22', '2026-09-22', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 13, 6, 0, 4, NULL, NULL, '2026-09-22', NULL, '2026-09-25'),
	(78, '2026-09-25', 'pooja.reddy@contoso.com', 'Pooja Reddy', '2026-09-16', '2026-09-16', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 6, 2, 0, 2, NULL, NULL, '2026-09-16', NULL, '2026-09-25'),
	(79, '2026-09-25', 'brandon.hughes@contoso.com', 'Brandon Hughes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-09-25'),
	(80, '2026-09-25', 'kavita.sharma@contoso.com', 'Kavita Sharma', '2026-08-13', '2026-08-13', NULL, '2026-08-13', NULL, '2026-08-13', NULL, NULL, NULL, 'D30', 0, 0, 0, 0, '2026-08-10', '2026-08-05', '2026-08-13', '2026-08-11', '2026-09-25'),
	(81, '2026-09-25', 'sophia.laurent@contoso.com', 'Sophia Laurent', '2026-09-24', '2026-09-24', NULL, NULL, NULL, NULL, '2026-09-24', NULL, NULL, 'D30', 89, 41, 1, 11, '2026-09-24', '2026-09-11', '2026-09-24', '2026-09-01', '2026-09-25'),
	(82, '2026-09-25', 'natalie.brooks@contoso.com', 'Natalie Brooks', '2026-09-24', '2026-09-24', '2026-09-21', '2026-09-23', '2026-09-24', '2026-09-11', '2026-09-23', '2026-09-17', '2026-09-15', 'D30', 574, 286, 35, 22, '2026-09-24', '2026-09-19', '2026-09-24', '2026-09-24', '2026-09-25'),
	(83, '2026-09-25', 'rahul.bansal@contoso.com', 'Rahul Bansal', '2026-09-23', '2026-09-23', NULL, NULL, '2026-09-23', NULL, '2026-09-21', NULL, NULL, 'D30', 147, 71, 4, 15, '2026-09-07', '2026-08-13', '2026-09-23', '2026-09-11', '2026-09-25'),
	(84, '2026-09-25', 'hannah.cole@contoso.com', 'Hannah Cole', '2026-09-22', '2026-09-22', '2026-09-22', NULL, NULL, NULL, '2026-09-16', NULL, NULL, 'D30', 104, 38, 2, 14, '2026-09-22', '2026-08-31', '2026-09-22', '2026-09-07', '2026-09-25'),
	(85, '2026-09-25', 'imran.sheikh@contoso.com', 'Imran Sheikh', '2026-09-17', '2026-09-17', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 11, 5, 0, 3, NULL, NULL, '2026-09-17', NULL, '2026-09-25'),
	(86, '2026-09-25', 'grace.kim@contoso.com', 'Grace Kim', '2026-09-15', '2026-09-15', NULL, '2026-09-14', NULL, NULL, NULL, NULL, NULL, 'D30', 21, 12, 0, 5, NULL, NULL, '2026-09-15', NULL, '2026-09-25'),
	(87, '2026-09-25', 'aditi.rao@contoso.com', 'Aditi Rao', '2026-09-24', '2026-09-24', '2026-09-21', NULL, NULL, '2026-09-18', NULL, NULL, NULL, 'D30', 46, 20, 0, 5, '2026-09-21', '2026-09-16', '2026-09-24', NULL, '2026-09-25'),
	(88, '2026-09-25', 'rahul.nair@contoso.com', 'Rahul Nair', '2026-09-24', '2026-09-24', '2026-09-07', '2026-09-07', NULL, NULL, NULL, NULL, NULL, 'D30', 104, 48, 4, 12, '2026-09-04', '2026-09-24', '2026-09-24', '2026-09-24', '2026-09-25'),
	(89, '2026-09-25', 'siddharth.rane@contoso.com', 'Siddharth Rane', '2026-09-24', '2026-09-24', '2026-09-24', NULL, NULL, NULL, '2026-09-09', NULL, NULL, 'D30', 122, 59, 4, 14, '2026-09-23', '2026-09-18', '2026-09-24', '2026-09-19', '2026-09-25'),
	(90, '2026-09-25', 'amanda.price@contoso.com', 'Amanda Price', '2026-09-22', '2026-09-21', '2026-09-22', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 131, 53, 3, 13, '2026-08-19', '2026-09-18', '2026-09-21', '2026-09-07', '2026-09-25'),
	(91, '2026-09-25', 'lakshmi.narayan@contoso.com', 'Lakshmi Narayan', '2026-09-14', '2026-09-14', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 14, 7, 0, 5, NULL, NULL, '2026-09-14', NULL, '2026-09-25'),
	(92, '2026-09-25', 'jordan.blake@contoso.com', 'Jordan Blake', '2026-09-07', '2026-09-07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 12, 5, 0, 3, NULL, NULL, '2026-09-07', NULL, '2026-09-25'),
	(93, '2026-09-25', 'fatima.noor@contoso.com', 'Fatima Noor', '2026-09-22', '2026-09-22', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 8, 5, 0, 4, NULL, NULL, '2026-09-22', NULL, '2026-09-25'),
	(94, '2026-09-25', 'greg.dawson@contoso.com', 'Greg Dawson', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-09-25'),
	(95, '2026-09-25', 'ritu.saxena@contoso.com', 'Ritu Saxena', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-09-25'),
	(96, '2026-09-25', 'elena.rossi@contoso.com', 'Elena Rossi', '2026-09-21', '2026-09-21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 12, 6, 0, 4, '2026-09-21', NULL, '2026-09-21', NULL, '2026-09-25'),
	(97, '2026-09-25', 'isha.banerjee@contoso.com', 'Isha Banerjee', '2026-09-23', '2026-09-23', NULL, NULL, '2026-09-16', '2026-09-22', NULL, NULL, NULL, 'D30', 102, 35, 1, 14, '2026-09-10', '2026-08-17', '2026-09-23', '2026-09-21', '2026-09-25'),
	(98, '2026-09-25', 'pranav.kumar@contoso.com', 'Pranav Kumar', '2026-09-21', '2026-09-21', NULL, NULL, NULL, '2026-09-14', NULL, NULL, NULL, 'D30', 134, 62, 7, 15, '2026-09-09', '2026-09-10', '2026-09-21', '2026-09-21', '2026-09-25'),
	(99, '2026-09-25', 'claire.dubois@contoso.com', 'Claire Dubois', '2026-09-17', '2026-09-17', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 6, 3, 0, 2, NULL, NULL, '2026-09-17', NULL, '2026-09-25');
INSERT INTO public.copilot_usage_user_detail VALUES
	(100, '2026-09-25', 'anil.gupta@contoso.com', 'Anil Gupta', '2026-09-06', '2026-09-06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 13, 6, 0, 3, '2026-08-25', NULL, '2026-09-06', NULL, '2026-09-25'),
	(101, '2026-09-25', 'rebecca.stone@contoso.com', 'Rebecca Stone', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-09-25'),
	(102, '2026-09-25', 'dev.malik@contoso.com', 'Dev Malik', '2026-09-04', '2026-09-04', NULL, '2026-08-28', NULL, '2026-08-27', NULL, NULL, NULL, 'D30', 36, 16, 1, 4, '2026-08-24', '2026-09-03', '2026-09-04', '2026-09-04', '2026-09-25'),
	(103, '2026-09-25', 'julia.weber@contoso.com', 'Julia Weber', '2026-09-04', '2026-09-04', NULL, '2026-09-04', NULL, NULL, '2026-09-03', NULL, NULL, 'D30', 83, 35, 2, 8, '2026-07-31', '2026-09-03', '2026-09-04', '2026-09-04', '2026-09-25'),
	(104, '2026-10-23', 'anita.deshmukh@contoso.com', 'Anita Deshmukh', '2026-10-21', '2026-10-21', NULL, '2026-10-21', NULL, NULL, '2026-10-16', NULL, NULL, 'D30', 129, 55, 3, 15, '2026-10-20', '2026-10-13', '2026-10-21', '2026-10-15', '2026-10-23'),
	(105, '2026-10-23', 'vikram.rao@contoso.com', 'Vikram Rao', '2026-10-22', '2026-10-22', '2026-10-22', '2026-10-21', '2026-10-22', '2026-10-21', '2026-10-22', '2026-10-06', '2026-09-07', 'D30', 595, 267, 28, 23, '2026-10-22', '2026-10-19', '2026-10-22', '2026-10-22', '2026-10-23'),
	(106, '2026-10-23', 'priya.nambiar@contoso.com', 'Priya Nambiar', '2026-10-22', '2026-10-22', '2026-10-20', '2026-10-22', '2026-10-19', '2026-10-21', '2026-10-20', '2026-10-20', '2026-10-15', 'D30', 559, 236, 26, 22, '2026-10-20', '2026-10-16', '2026-10-22', '2026-10-22', '2026-10-23'),
	(107, '2026-10-23', 'arjun.mehta@contoso.com', 'Arjun Mehta', '2026-10-20', '2026-10-20', '2026-10-15', NULL, NULL, '2026-10-15', NULL, NULL, NULL, 'D30', 144, 67, 5, 17, '2026-09-30', '2026-10-02', '2026-10-20', '2026-10-09', '2026-10-23'),
	(108, '2026-10-23', 'neha.kapoor@contoso.com', 'Neha Kapoor', '2026-10-22', '2026-10-22', '2026-10-20', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 119, 58, 4, 14, '2026-10-22', '2026-10-15', '2026-10-22', '2026-10-20', '2026-10-23'),
	(109, '2026-10-23', 'rohan.iyer@contoso.com', 'Rohan Iyer', '2026-10-21', '2026-10-21', NULL, NULL, '2026-10-21', '2026-10-08', NULL, NULL, NULL, 'D30', 120, 58, 1, 16, '2026-10-19', '2026-10-08', '2026-10-21', '2026-09-25', '2026-10-23'),
	(110, '2026-10-23', 'sana.qureshi@contoso.com', 'Sana Qureshi', '2026-10-02', '2026-10-02', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 7, 4, 0, 2, NULL, NULL, '2026-10-02', NULL, '2026-10-23'),
	(111, '2026-10-23', 'tom.becker@contoso.com', 'Tom Becker', '2026-10-08', '2026-10-08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 9, 4, 0, 2, NULL, NULL, '2026-10-08', NULL, '2026-10-23'),
	(113, '2026-10-23', 'luis.ortega@contoso.com', 'Luis Ortega', '2026-08-14', '2026-08-14', NULL, '2026-08-14', '2026-08-14', NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, '2026-08-14', '2026-08-14', '2026-08-13', '2026-10-23'),
	(114, '2026-10-23', 'meera.pillai@contoso.com', 'Meera Pillai', '2026-10-22', '2026-10-22', NULL, NULL, '2026-10-15', '2026-10-21', NULL, NULL, NULL, 'D30', 144, 59, 1, 15, '2026-10-22', '2026-10-14', '2026-10-22', '2026-10-14', '2026-10-23'),
	(115, '2026-10-23', 'karan.malhotra@contoso.com', 'Karan Malhotra', '2026-10-22', '2026-10-22', '2026-10-22', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 148, 69, 8, 16, '2026-10-08', '2026-10-06', '2026-10-22', '2026-10-20', '2026-10-23'),
	(116, '2026-10-23', 'jessica.lee@contoso.com', 'Jessica Lee', '2026-10-22', '2026-10-22', '2026-10-22', '2026-10-22', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-19', '2026-09-21', 'D30', 489, 211, 15, 19, '2026-10-16', '2026-10-19', '2026-10-22', '2026-10-22', '2026-10-23'),
	(117, '2026-10-23', 'ishaan.verma@contoso.com', 'Ishaan Verma', '2026-10-22', '2026-10-22', NULL, '2026-10-14', NULL, NULL, '2026-10-16', NULL, NULL, 'D30', 135, 58, 4, 17, '2026-10-16', '2026-10-15', '2026-10-22', '2026-10-13', '2026-10-23'),
	(118, '2026-10-23', 'olivia.grant@contoso.com', 'Olivia Grant', '2026-10-20', '2026-10-20', '2026-10-20', NULL, NULL, NULL, '2026-10-08', NULL, NULL, 'D30', 124, 55, 3, 13, '2026-10-14', '2026-10-09', '2026-10-20', '2026-10-20', '2026-10-23'),
	(119, '2026-10-23', 'aarav.shah@contoso.com', 'Aarav Shah', '2026-10-14', '2026-10-14', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 10, 4, 0, 4, NULL, NULL, '2026-10-14', NULL, '2026-10-23'),
	(120, '2026-10-23', 'maya.krishnan@contoso.com', 'Maya Krishnan', '2026-10-21', '2026-10-21', '2026-10-09', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 21, 11, 0, 6, '2026-10-09', NULL, '2026-10-21', NULL, '2026-10-23'),
	(121, '2026-10-23', 'daniel.foster@contoso.com', 'Daniel Foster', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-10-23'),
	(122, '2026-10-23', 'michael.turner@contoso.com', 'Michael Turner', '2026-10-22', '2026-10-22', NULL, NULL, '2026-10-22', '2026-10-19', NULL, NULL, NULL, 'D30', 104, 46, 3, 14, '2026-09-27', '2026-10-12', '2026-10-22', '2026-10-07', '2026-10-23'),
	(123, '2026-10-23', 'ananya.das@contoso.com', 'Ananya Das', '2026-10-22', '2026-10-22', '2026-10-22', '2026-10-20', '2026-10-16', '2026-10-22', '2026-10-22', '2026-10-21', '2026-09-17', 'D30', 555, 222, 27, 21, '2026-10-21', '2026-10-21', '2026-10-22', '2026-10-21', '2026-10-23'),
	(124, '2026-10-23', 'mark.robinson@contoso.com', 'Mark Robinson', '2026-10-22', '2026-10-22', '2026-10-21', '2026-10-16', '2026-10-20', '2026-10-21', '2026-10-16', '2026-10-09', '2026-09-25', 'D30', 535, 245, 46, 19, '2026-10-22', '2026-10-14', '2026-10-22', '2026-10-22', '2026-10-23'),
	(125, '2026-10-23', 'varun.chopra@contoso.com', 'Varun Chopra', '2026-10-22', '2026-10-21', '2026-10-22', '2026-10-22', '2026-10-21', '2026-10-22', '2026-10-21', '2026-10-22', '2026-10-16', 'D30', 640, 271, 39, 23, '2026-10-22', '2026-10-20', '2026-10-21', '2026-10-21', '2026-10-23'),
	(126, '2026-10-23', 'emily.carter@contoso.com', 'Emily Carter', '2026-10-22', '2026-10-22', NULL, '2026-10-22', NULL, '2026-10-22', NULL, NULL, NULL, 'D30', 83, 36, 1, 12, '2026-10-15', '2026-10-22', '2026-10-22', '2026-10-02', '2026-10-23'),
	(127, '2026-10-23', 'rakesh.joshi@contoso.com', 'Rakesh Joshi', '2026-10-16', '2026-10-16', NULL, '2026-10-09', NULL, NULL, NULL, NULL, NULL, 'D30', 99, 44, 1, 14, '2026-10-12', '2026-10-13', '2026-10-16', '2026-09-30', '2026-10-23'),
	(128, '2026-10-23', 'nina.patel@contoso.com', 'Nina Patel', '2026-10-21', '2026-10-21', NULL, '2026-10-16', '2026-10-20', NULL, NULL, NULL, NULL, 'D30', 94, 37, 1, 13, '2026-10-01', '2026-10-21', '2026-10-21', '2026-09-30', '2026-10-23'),
	(129, '2026-10-23', 'chris.walker@contoso.com', 'Chris Walker', '2026-10-07', '2026-10-07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 3, 1, 0, 1, NULL, NULL, '2026-10-07', NULL, '2026-10-23'),
	(130, '2026-10-23', 'pooja.reddy@contoso.com', 'Pooja Reddy', '2026-10-09', '2026-10-09', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 10, 5, 0, 3, NULL, NULL, '2026-10-09', NULL, '2026-10-23'),
	(131, '2026-10-23', 'brandon.hughes@contoso.com', 'Brandon Hughes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-10-23'),
	(132, '2026-10-23', 'kavita.sharma@contoso.com', 'Kavita Sharma', '2026-08-13', '2026-08-13', NULL, '2026-08-13', NULL, '2026-08-13', NULL, NULL, NULL, 'D30', 0, 0, 0, 0, '2026-08-10', '2026-08-05', '2026-08-13', '2026-08-11', '2026-10-23'),
	(133, '2026-10-23', 'sophia.laurent@contoso.com', 'Sophia Laurent', '2026-10-22', '2026-10-22', NULL, NULL, NULL, NULL, '2026-10-22', NULL, NULL, 'D30', 155, 70, 3, 18, '2026-10-02', '2026-10-16', '2026-10-22', '2026-10-12', '2026-10-23'),
	(134, '2026-10-23', 'natalie.brooks@contoso.com', 'Natalie Brooks', '2026-10-22', '2026-10-22', '2026-10-21', '2026-10-21', '2026-10-22', '2026-10-21', '2026-10-16', '2026-10-20', '2026-09-15', 'D30', 565, 250, 26, 23, '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-16', '2026-10-23'),
	(135, '2026-10-23', 'rahul.bansal@contoso.com', 'Rahul Bansal', '2026-10-22', '2026-10-22', NULL, NULL, '2026-10-22', NULL, '2026-10-22', NULL, NULL, 'D30', 121, 59, 4, 15, '2026-10-20', '2026-09-28', '2026-10-22', '2026-10-21', '2026-10-23'),
	(136, '2026-10-23', 'hannah.cole@contoso.com', 'Hannah Cole', '2026-10-22', '2026-10-22', '2026-10-19', NULL, NULL, NULL, '2026-10-21', NULL, NULL, 'D30', 119, 45, 6, 16, '2026-10-21', '2026-10-22', '2026-10-22', '2026-10-20', '2026-10-23'),
	(137, '2026-10-23', 'imran.sheikh@contoso.com', 'Imran Sheikh', '2026-10-14', '2026-10-14', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 11, 6, 0, 3, NULL, NULL, '2026-10-14', NULL, '2026-10-23'),
	(138, '2026-10-23', 'grace.kim@contoso.com', 'Grace Kim', '2026-10-21', '2026-10-21', NULL, '2026-10-21', NULL, NULL, NULL, NULL, NULL, 'D30', 16, 7, 0, 4, NULL, NULL, '2026-10-21', NULL, '2026-10-23'),
	(139, '2026-10-23', 'aditi.rao@contoso.com', 'Aditi Rao', '2026-10-22', '2026-10-22', '2026-10-22', NULL, NULL, '2026-10-20', NULL, NULL, NULL, 'D30', 137, 52, 2, 17, '2026-10-09', '2026-10-12', '2026-10-22', '2026-10-14', '2026-10-23'),
	(140, '2026-10-23', 'rahul.nair@contoso.com', 'Rahul Nair', '2026-10-21', '2026-10-21', '2026-10-19', '2026-10-19', NULL, NULL, NULL, NULL, NULL, 'D30', 149, 65, 3, 15, '2026-10-19', '2026-10-16', '2026-10-21', '2026-09-30', '2026-10-23'),
	(141, '2026-10-23', 'siddharth.rane@contoso.com', 'Siddharth Rane', '2026-10-22', '2026-10-22', '2026-10-19', NULL, NULL, NULL, '2026-10-22', NULL, NULL, 'D30', 188, 82, 5, 20, '2026-10-14', '2026-10-22', '2026-10-22', '2026-10-22', '2026-10-23'),
	(142, '2026-10-23', 'amanda.price@contoso.com', 'Amanda Price', '2026-10-21', '2026-10-20', '2026-10-21', NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 71, 25, 1, 9, '2026-10-21', '2026-10-16', '2026-10-20', '2026-10-16', '2026-10-23'),
	(143, '2026-10-23', 'lakshmi.narayan@contoso.com', 'Lakshmi Narayan', '2026-10-21', '2026-10-21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 26, 10, 0, 6, NULL, NULL, '2026-10-21', NULL, '2026-10-23'),
	(144, '2026-10-23', 'jordan.blake@contoso.com', 'Jordan Blake', '2026-09-07', '2026-09-07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, '2026-09-07', NULL, '2026-10-23'),
	(145, '2026-10-23', 'fatima.noor@contoso.com', 'Fatima Noor', '2026-10-22', '2026-10-22', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 15, 8, 0, 6, '2026-10-05', NULL, '2026-10-22', NULL, '2026-10-23'),
	(146, '2026-10-23', 'greg.dawson@contoso.com', 'Greg Dawson', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-10-23'),
	(147, '2026-10-23', 'ritu.saxena@contoso.com', 'Ritu Saxena', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-10-23'),
	(148, '2026-10-23', 'elena.rossi@contoso.com', 'Elena Rossi', '2026-10-22', '2026-10-22', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 3, 2, 0, 2, '2026-09-21', NULL, '2026-10-22', NULL, '2026-10-23'),
	(149, '2026-10-23', 'isha.banerjee@contoso.com', 'Isha Banerjee', '2026-10-20', '2026-10-20', NULL, NULL, '2026-10-20', '2026-09-28', NULL, NULL, NULL, 'D30', 109, 53, 1, 12, '2026-10-20', '2026-10-15', '2026-10-20', '2026-10-13', '2026-10-23'),
	(150, '2026-10-23', 'pranav.kumar@contoso.com', 'Pranav Kumar', '2026-10-22', '2026-10-22', NULL, NULL, NULL, '2026-10-19', NULL, NULL, NULL, 'D30', 144, 68, 6, 15, '2026-10-16', '2026-10-16', '2026-10-22', '2026-10-19', '2026-10-23');
INSERT INTO public.copilot_usage_user_detail VALUES
	(151, '2026-10-23', 'claire.dubois@contoso.com', 'Claire Dubois', '2026-10-19', '2026-10-19', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 12, 5, 0, 4, NULL, NULL, '2026-10-19', NULL, '2026-10-23'),
	(152, '2026-10-23', 'anil.gupta@contoso.com', 'Anil Gupta', '2026-10-16', '2026-10-16', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 10, 4, 0, 3, '2026-08-25', NULL, '2026-10-16', NULL, '2026-10-23'),
	(153, '2026-10-23', 'rebecca.stone@contoso.com', 'Rebecca Stone', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-10-23'),
	(154, '2026-08-28', 'nikhil.saini@contoso.com', 'Nikhil Saini', '2026-08-27', '2026-08-27', '2026-08-26', '2026-08-25', NULL, NULL, '2026-08-27', NULL, NULL, 'D30', 187, 82, 6, 17, '2026-08-24', '2026-08-26', '2026-08-27', '2026-08-25', '2026-08-28'),
	(155, '2026-08-28', 'lena.fischer@contoso.com', 'Lena Fischer', '2026-08-26', '2026-08-26', NULL, '2026-08-24', NULL, NULL, NULL, NULL, NULL, 'D30', 64, 28, 2, 9, NULL, '2026-08-20', '2026-08-26', '2026-08-19', '2026-08-28'),
	(156, '2026-08-28', 'sam.rivera@contoso.com', 'Sam Rivera', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-08-28'),
	(157, '2026-09-25', 'nikhil.saini@contoso.com', 'Nikhil Saini', '2026-09-24', '2026-09-24', '2026-09-23', '2026-09-22', NULL, NULL, '2026-09-24', NULL, NULL, 'D30', 187, 82, 6, 17, '2026-09-21', '2026-09-23', '2026-09-24', '2026-09-22', '2026-09-25'),
	(158, '2026-09-25', 'lena.fischer@contoso.com', 'Lena Fischer', '2026-09-02', '2026-09-02', NULL, '2026-09-02', NULL, NULL, NULL, NULL, NULL, 'D30', 24, 11, 0, 5, NULL, '2026-08-30', '2026-09-02', NULL, '2026-09-25'),
	(159, '2026-09-25', 'sam.rivera@contoso.com', 'Sam Rivera', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-09-25'),
	(160, '2026-10-23', 'nikhil.saini@contoso.com', 'Nikhil Saini', '2026-10-22', '2026-10-22', '2026-10-21', '2026-10-20', NULL, NULL, '2026-10-22', NULL, NULL, 'D30', 187, 82, 6, 17, '2026-10-19', '2026-10-21', '2026-10-22', '2026-10-20', '2026-10-23'),
	(161, '2026-10-23', 'lena.fischer@contoso.com', 'Lena Fischer', '2026-09-02', '2026-09-02', NULL, '2026-09-02', NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, '2026-08-30', '2026-09-02', NULL, '2026-10-23'),
	(162, '2026-10-23', 'sam.rivera@contoso.com', 'Sam Rivera', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'D30', 0, 0, 0, 0, NULL, NULL, NULL, NULL, '2026-10-23');


-- Data for Name: copilot_user_count_summary; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.copilot_user_count_summary VALUES
	(1, '2026-08-28', 'D30', 54, 45, 54, 17, 54, 19, 54, 16, 54, 16, 54, 14, 54, 7, 54, 3, 54, 45, '2026-08-28 03:00:00+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	(2, '2026-09-25', 'D30', 53, 46, 53, 17, 53, 18, 53, 16, 53, 16, 53, 13, 53, 7, 53, 5, 53, 46, '2026-09-25 03:00:00+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	(3, '2026-10-23', 'D30', 53, 42, 53, 18, 53, 15, 53, 15, 53, 15, 53, 13, 53, 7, 53, 3, 53, 42, '2026-10-23 03:00:00+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


-- Data for Name: copilot_user_count_trend; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.copilot_user_count_trend VALUES
	(1, '2026-08-28', 'D30', '2026-07-29', 54, 25, 54, 9, 54, 7, 54, 6, 54, 9, 54, 5, 54, 2, 54, 0, 54, 23, 54, 5, 54, 6, 54, 23, 54, 6, 326, '2026-08-28 03:00:00+00'),
	(2, '2026-08-28', 'D30', '2026-07-30', 54, 19, 54, 7, 54, 5, 54, 5, 54, 6, 54, 3, 54, 1, 54, 0, 54, 17, 54, 4, 54, 2, 54, 17, 54, 7, 280, '2026-08-28 03:00:00+00'),
	(3, '2026-08-28', 'D30', '2026-07-31', 54, 23, 54, 6, 54, 6, 54, 3, 54, 8, 54, 4, 54, 0, 54, 0, 54, 22, 54, 6, 54, 6, 54, 22, 54, 12, 311, '2026-08-28 03:00:00+00'),
	(4, '2026-08-28', 'D30', '2026-08-01', 54, 1, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 1, 54, 0, 54, 0, 54, 1, 54, 0, 2, '2026-08-28 03:00:00+00'),
	(5, '2026-08-28', 'D30', '2026-08-02', 54, 2, 54, 0, 54, 1, 54, 1, 54, 1, 54, 2, 54, 0, 54, 0, 54, 2, 54, 0, 54, 2, 54, 2, 54, 2, 57, '2026-08-28 03:00:00+00'),
	(6, '2026-08-28', 'D30', '2026-08-03', 54, 19, 54, 9, 54, 5, 54, 5, 54, 5, 54, 5, 54, 0, 54, 1, 54, 18, 54, 6, 54, 5, 54, 18, 54, 5, 278, '2026-08-28 03:00:00+00'),
	(7, '2026-08-28', 'D30', '2026-08-04', 54, 28, 54, 8, 54, 5, 54, 8, 54, 8, 54, 4, 54, 0, 54, 0, 54, 27, 54, 4, 54, 4, 54, 27, 54, 9, 323, '2026-08-28 03:00:00+00'),
	(8, '2026-08-28', 'D30', '2026-08-05', 54, 23, 54, 4, 54, 6, 54, 5, 54, 3, 54, 0, 54, 2, 54, 0, 54, 22, 54, 4, 54, 9, 54, 22, 54, 4, 286, '2026-08-28 03:00:00+00'),
	(9, '2026-08-28', 'D30', '2026-08-06', 54, 25, 54, 9, 54, 7, 54, 6, 54, 7, 54, 4, 54, 0, 54, 1, 54, 21, 54, 3, 54, 5, 54, 21, 54, 9, 357, '2026-08-28 03:00:00+00'),
	(10, '2026-08-28', 'D30', '2026-08-07', 54, 18, 54, 8, 54, 6, 54, 2, 54, 7, 54, 4, 54, 2, 54, 0, 54, 17, 54, 2, 54, 4, 54, 17, 54, 3, 228, '2026-08-28 03:00:00+00'),
	(11, '2026-08-28', 'D30', '2026-08-08', 54, 5, 54, 3, 54, 1, 54, 1, 54, 2, 54, 2, 54, 0, 54, 0, 54, 5, 54, 1, 54, 1, 54, 5, 54, 2, 65, '2026-08-28 03:00:00+00'),
	(12, '2026-08-28', 'D30', '2026-08-09', 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 54, 0, 0, '2026-08-28 03:00:00+00'),
	(13, '2026-08-28', 'D30', '2026-08-10', 54, 27, 54, 7, 54, 6, 54, 7, 54, 6, 54, 3, 54, 1, 54, 0, 54, 24, 54, 6, 54, 2, 54, 24, 54, 13, 348, '2026-08-28 03:00:00+00'),
	(14, '2026-08-28', 'D30', '2026-08-11', 54, 26, 54, 7, 54, 7, 54, 5, 54, 7, 54, 6, 54, 1, 54, 0, 54, 25, 54, 2, 54, 5, 54, 25, 54, 8, 301, '2026-08-28 03:00:00+00'),
	(15, '2026-08-28', 'D30', '2026-08-12', 54, 24, 54, 5, 54, 6, 54, 5, 54, 7, 54, 5, 54, 0, 54, 0, 54, 20, 54, 8, 54, 4, 54, 20, 54, 7, 265, '2026-08-28 03:00:00+00'),
	(16, '2026-08-28', 'D30', '2026-08-13', 54, 23, 54, 7, 54, 5, 54, 3, 54, 3, 54, 2, 54, 0, 54, 1, 54, 21, 54, 6, 54, 5, 54, 21, 54, 7, 291, '2026-08-28 03:00:00+00'),
	(17, '2026-08-28', 'D30', '2026-08-14', 54, 25, 54, 3, 54, 4, 54, 5, 54, 8, 54, 8, 54, 1, 54, 0, 54, 21, 54, 2, 54, 6, 54, 21, 54, 7, 321, '2026-08-28 03:00:00+00'),
	(18, '2026-08-28', 'D30', '2026-08-15', 54, 2, 54, 2, 54, 1, 54, 1, 54, 0, 54, 0, 54, 0, 54, 0, 54, 2, 54, 1, 54, 0, 54, 2, 54, 2, 60, '2026-08-28 03:00:00+00'),
	(19, '2026-08-28', 'D30', '2026-08-16', 54, 3, 54, 2, 54, 0, 54, 0, 54, 0, 54, 1, 54, 0, 54, 0, 54, 2, 54, 0, 54, 1, 54, 2, 54, 0, 18, '2026-08-28 03:00:00+00'),
	(20, '2026-08-28', 'D30', '2026-08-17', 54, 24, 54, 5, 54, 5, 54, 6, 54, 4, 54, 7, 54, 0, 54, 0, 54, 23, 54, 0, 54, 7, 54, 23, 54, 5, 322, '2026-08-28 03:00:00+00'),
	(21, '2026-08-28', 'D30', '2026-08-18', 54, 20, 54, 3, 54, 7, 54, 3, 54, 6, 54, 6, 54, 1, 54, 1, 54, 19, 54, 4, 54, 4, 54, 19, 54, 6, 261, '2026-08-28 03:00:00+00'),
	(22, '2026-08-28', 'D30', '2026-08-19', 54, 25, 54, 5, 54, 5, 54, 3, 54, 8, 54, 6, 54, 0, 54, 0, 54, 22, 54, 8, 54, 3, 54, 22, 54, 7, 333, '2026-08-28 03:00:00+00'),
	(23, '2026-08-28', 'D30', '2026-08-20', 54, 20, 54, 8, 54, 5, 54, 3, 54, 4, 54, 2, 54, 1, 54, 0, 54, 18, 54, 0, 54, 3, 54, 18, 54, 5, 271, '2026-08-28 03:00:00+00'),
	(24, '2026-08-28', 'D30', '2026-08-21', 54, 23, 54, 7, 54, 7, 54, 7, 54, 4, 54, 5, 54, 0, 54, 0, 54, 23, 54, 1, 54, 3, 54, 23, 54, 4, 316, '2026-08-28 03:00:00+00'),
	(25, '2026-08-28', 'D30', '2026-08-22', 54, 1, 54, 1, 54, 1, 54, 1, 54, 0, 54, 0, 54, 1, 54, 0, 54, 1, 54, 0, 54, 1, 54, 1, 54, 1, 25, '2026-08-28 03:00:00+00'),
	(26, '2026-08-28', 'D30', '2026-08-23', 54, 4, 54, 1, 54, 1, 54, 0, 54, 1, 54, 1, 54, 0, 54, 0, 54, 4, 54, 0, 54, 0, 54, 4, 54, 0, 48, '2026-08-28 03:00:00+00'),
	(27, '2026-08-28', 'D30', '2026-08-24', 54, 20, 54, 5, 54, 2, 54, 5, 54, 7, 54, 5, 54, 0, 54, 1, 54, 17, 54, 3, 54, 6, 54, 17, 54, 10, 310, '2026-08-28 03:00:00+00'),
	(28, '2026-08-28', 'D30', '2026-08-25', 54, 20, 54, 4, 54, 6, 54, 5, 54, 5, 54, 4, 54, 1, 54, 0, 54, 19, 54, 3, 54, 2, 54, 19, 54, 8, 304, '2026-08-28 03:00:00+00'),
	(29, '2026-08-28', 'D30', '2026-08-26', 54, 20, 54, 5, 54, 4, 54, 4, 54, 4, 54, 4, 54, 2, 54, 0, 54, 19, 54, 4, 54, 3, 54, 19, 54, 6, 223, '2026-08-28 03:00:00+00'),
	(30, '2026-08-28', 'D30', '2026-08-27', 54, 28, 54, 8, 54, 10, 54, 6, 54, 5, 54, 9, 54, 1, 54, 0, 54, 24, 54, 4, 54, 6, 54, 24, 54, 3, 303, '2026-08-28 03:00:00+00'),
	(31, '2026-09-25', 'D30', '2026-08-26', 54, 20, 54, 5, 54, 4, 54, 4, 54, 4, 54, 4, 54, 2, 54, 0, 54, 19, 54, 4, 54, 3, 54, 19, 54, 6, 223, '2026-09-25 03:00:00+00'),
	(32, '2026-09-25', 'D30', '2026-08-27', 54, 28, 54, 8, 54, 10, 54, 6, 54, 5, 54, 9, 54, 1, 54, 0, 54, 24, 54, 4, 54, 6, 54, 24, 54, 3, 303, '2026-09-25 03:00:00+00'),
	(33, '2026-09-25', 'D30', '2026-08-28', 54, 21, 54, 6, 54, 6, 54, 2, 54, 2, 54, 4, 54, 0, 54, 0, 54, 18, 54, 0, 54, 4, 54, 18, 54, 5, 273, '2026-09-25 03:00:00+00'),
	(34, '2026-09-25', 'D30', '2026-08-29', 54, 4, 54, 3, 54, 3, 54, 1, 54, 2, 54, 0, 54, 1, 54, 0, 54, 4, 54, 1, 54, 1, 54, 4, 54, 2, 68, '2026-09-25 03:00:00+00'),
	(35, '2026-09-25', 'D30', '2026-08-30', 54, 3, 54, 1, 54, 0, 54, 2, 54, 1, 54, 0, 54, 0, 54, 0, 54, 3, 54, 0, 54, 0, 54, 3, 54, 1, 61, '2026-09-25 03:00:00+00'),
	(36, '2026-09-25', 'D30', '2026-08-31', 54, 25, 54, 9, 54, 9, 54, 5, 54, 6, 54, 3, 54, 0, 54, 0, 54, 24, 54, 8, 54, 5, 54, 24, 54, 11, 348, '2026-09-25 03:00:00+00'),
	(37, '2026-09-25', 'D30', '2026-09-01', 54, 19, 54, 4, 54, 2, 54, 3, 54, 9, 54, 2, 54, 0, 54, 1, 54, 18, 54, 2, 54, 3, 54, 18, 54, 11, 292, '2026-09-25 03:00:00+00'),
	(38, '2026-09-25', 'D30', '2026-09-02', 54, 20, 54, 5, 54, 6, 54, 5, 54, 4, 54, 3, 54, 1, 54, 0, 54, 19, 54, 1, 54, 4, 54, 19, 54, 7, 273, '2026-09-25 03:00:00+00'),
	(39, '2026-09-25', 'D30', '2026-09-03', 54, 27, 54, 6, 54, 9, 54, 4, 54, 5, 54, 3, 54, 0, 54, 1, 54, 25, 54, 6, 54, 6, 54, 25, 54, 7, 349, '2026-09-25 03:00:00+00'),
	(40, '2026-09-25', 'D30', '2026-09-04', 54, 25, 54, 7, 54, 7, 54, 7, 54, 5, 54, 4, 54, 1, 54, 0, 54, 24, 54, 2, 54, 4, 54, 24, 54, 8, 382, '2026-09-25 03:00:00+00'),
	(41, '2026-09-25', 'D30', '2026-09-05', 52, 1, 52, 1, 52, 0, 52, 0, 52, 1, 52, 0, 52, 0, 52, 0, 52, 1, 52, 0, 52, 1, 52, 1, 52, 1, 13, '2026-09-25 03:00:00+00'),
	(42, '2026-09-25', 'D30', '2026-09-06', 52, 1, 52, 0, 52, 0, 52, 0, 52, 0, 52, 0, 52, 0, 52, 0, 52, 1, 52, 0, 52, 0, 52, 1, 52, 0, 5, '2026-09-25 03:00:00+00'),
	(43, '2026-09-25', 'D30', '2026-09-07', 52, 25, 52, 7, 52, 3, 52, 7, 52, 5, 52, 5, 52, 2, 52, 1, 52, 21, 52, 5, 52, 4, 52, 21, 52, 9, 293, '2026-09-25 03:00:00+00'),
	(44, '2026-09-25', 'D30', '2026-09-08', 52, 20, 52, 4, 52, 4, 52, 4, 52, 6, 52, 4, 52, 0, 52, 0, 52, 17, 52, 2, 52, 2, 52, 17, 52, 5, 278, '2026-09-25 03:00:00+00'),
	(45, '2026-09-25', 'D30', '2026-09-09', 52, 22, 52, 5, 52, 3, 52, 3, 52, 8, 52, 1, 52, 0, 52, 0, 52, 20, 52, 7, 52, 3, 52, 20, 52, 10, 345, '2026-09-25 03:00:00+00'),
	(46, '2026-09-25', 'D30', '2026-09-10', 52, 22, 52, 4, 52, 7, 52, 7, 52, 4, 52, 9, 52, 3, 52, 0, 52, 21, 52, 5, 52, 7, 52, 21, 52, 10, 341, '2026-09-25 03:00:00+00'),
	(47, '2026-09-25', 'D30', '2026-09-11', 52, 21, 52, 8, 52, 5, 52, 7, 52, 6, 52, 4, 52, 2, 52, 0, 52, 19, 52, 4, 52, 5, 52, 19, 52, 5, 266, '2026-09-25 03:00:00+00'),
	(48, '2026-09-25', 'D30', '2026-09-12', 52, 3, 52, 0, 52, 2, 52, 1, 52, 0, 52, 2, 52, 0, 52, 0, 52, 3, 52, 0, 52, 1, 52, 3, 52, 3, 98, '2026-09-25 03:00:00+00'),
	(49, '2026-09-25', 'D30', '2026-09-13', 52, 1, 52, 1, 52, 1, 52, 0, 52, 1, 52, 1, 52, 0, 52, 0, 52, 0, 52, 0, 52, 0, 52, 0, 52, 0, 11, '2026-09-25 03:00:00+00'),
	(50, '2026-09-25', 'D30', '2026-09-14', 53, 23, 53, 3, 53, 5, 53, 4, 53, 7, 53, 3, 53, 1, 53, 0, 53, 22, 53, 3, 53, 3, 53, 22, 53, 3, 268, '2026-09-25 03:00:00+00');
INSERT INTO public.copilot_user_count_trend VALUES
	(51, '2026-09-25', 'D30', '2026-09-15', 53, 17, 53, 6, 53, 3, 53, 2, 53, 1, 53, 3, 53, 0, 53, 1, 53, 16, 53, 3, 53, 4, 53, 16, 53, 7, 246, '2026-09-25 03:00:00+00'),
	(52, '2026-09-25', 'D30', '2026-09-16', 53, 22, 53, 8, 53, 6, 53, 3, 53, 5, 53, 6, 53, 3, 53, 0, 53, 21, 53, 8, 53, 8, 53, 21, 53, 7, 303, '2026-09-25 03:00:00+00'),
	(53, '2026-09-25', 'D30', '2026-09-17', 53, 20, 53, 4, 53, 5, 53, 4, 53, 4, 53, 5, 53, 1, 53, 1, 53, 18, 53, 6, 53, 5, 53, 18, 53, 7, 255, '2026-09-25 03:00:00+00'),
	(54, '2026-09-25', 'D30', '2026-09-18', 53, 22, 53, 8, 53, 5, 53, 5, 53, 4, 53, 8, 53, 2, 53, 0, 53, 21, 53, 4, 53, 3, 53, 21, 53, 4, 270, '2026-09-25 03:00:00+00'),
	(55, '2026-09-25', 'D30', '2026-09-19', 53, 4, 53, 2, 53, 1, 53, 0, 53, 0, 53, 1, 53, 0, 53, 0, 53, 4, 53, 2, 53, 1, 53, 4, 53, 2, 66, '2026-09-25 03:00:00+00'),
	(56, '2026-09-25', 'D30', '2026-09-20', 53, 1, 53, 1, 53, 1, 53, 0, 53, 1, 53, 0, 53, 0, 53, 0, 53, 1, 53, 1, 53, 1, 53, 1, 53, 1, 45, '2026-09-25 03:00:00+00'),
	(57, '2026-09-25', 'D30', '2026-09-21', 53, 23, 53, 6, 53, 4, 53, 2, 53, 4, 53, 2, 53, 0, 53, 1, 53, 23, 53, 5, 53, 5, 53, 23, 53, 6, 296, '2026-09-25 03:00:00+00'),
	(58, '2026-09-25', 'D30', '2026-09-22', 53, 23, 53, 6, 53, 3, 53, 7, 53, 4, 53, 5, 53, 0, 53, 0, 53, 22, 53, 6, 53, 3, 53, 22, 53, 6, 307, '2026-09-25 03:00:00+00'),
	(59, '2026-09-25', 'D30', '2026-09-23', 53, 21, 53, 3, 53, 4, 53, 3, 53, 6, 53, 5, 53, 1, 53, 0, 53, 21, 53, 4, 53, 4, 53, 21, 53, 5, 310, '2026-09-25 03:00:00+00'),
	(60, '2026-09-25', 'D30', '2026-09-24', 53, 19, 53, 4, 53, 3, 53, 4, 53, 7, 53, 4, 53, 0, 53, 0, 53, 18, 53, 5, 53, 3, 53, 18, 53, 5, 215, '2026-09-25 03:00:00+00'),
	(61, '2026-10-23', 'D30', '2026-09-23', 53, 21, 53, 3, 53, 4, 53, 3, 53, 6, 53, 5, 53, 1, 53, 0, 53, 21, 53, 4, 53, 4, 53, 21, 53, 5, 310, '2026-10-23 03:00:00+00'),
	(62, '2026-10-23', 'D30', '2026-09-24', 53, 19, 53, 4, 53, 3, 53, 4, 53, 7, 53, 4, 53, 0, 53, 0, 53, 18, 53, 5, 53, 3, 53, 18, 53, 5, 215, '2026-10-23 03:00:00+00'),
	(63, '2026-10-23', 'D30', '2026-09-25', 53, 20, 53, 3, 53, 2, 53, 3, 53, 6, 53, 4, 53, 1, 53, 1, 53, 20, 53, 3, 53, 8, 53, 20, 53, 8, 301, '2026-10-23 03:00:00+00'),
	(64, '2026-10-23', 'D30', '2026-09-26', 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 0, '2026-10-23 03:00:00+00'),
	(65, '2026-10-23', 'D30', '2026-09-27', 53, 2, 53, 1, 53, 0, 53, 1, 53, 1, 53, 1, 53, 0, 53, 0, 53, 1, 53, 1, 53, 0, 53, 1, 53, 0, 20, '2026-10-23 03:00:00+00'),
	(66, '2026-10-23', 'D30', '2026-09-28', 53, 19, 53, 3, 53, 5, 53, 5, 53, 7, 53, 8, 53, 0, 53, 0, 53, 17, 53, 5, 53, 7, 53, 17, 53, 5, 292, '2026-10-23 03:00:00+00'),
	(67, '2026-10-23', 'D30', '2026-09-29', 53, 27, 53, 7, 53, 7, 53, 5, 53, 5, 53, 4, 53, 1, 53, 0, 53, 27, 53, 4, 53, 5, 53, 27, 53, 9, 351, '2026-10-23 03:00:00+00'),
	(68, '2026-10-23', 'D30', '2026-09-30', 53, 19, 53, 7, 53, 4, 53, 4, 53, 4, 53, 4, 53, 1, 53, 0, 53, 18, 53, 8, 53, 5, 53, 18, 53, 11, 293, '2026-10-23 03:00:00+00'),
	(69, '2026-10-23', 'D30', '2026-10-01', 53, 22, 53, 4, 53, 7, 53, 3, 53, 6, 53, 2, 53, 1, 53, 1, 53, 22, 53, 2, 53, 3, 53, 22, 53, 5, 215, '2026-10-23 03:00:00+00'),
	(70, '2026-10-23', 'D30', '2026-10-02', 53, 24, 53, 6, 53, 3, 53, 2, 53, 6, 53, 2, 53, 1, 53, 0, 53, 20, 53, 5, 53, 5, 53, 20, 53, 7, 298, '2026-10-23 03:00:00+00'),
	(71, '2026-10-23', 'D30', '2026-10-03', 53, 3, 53, 1, 53, 1, 53, 0, 53, 1, 53, 0, 53, 0, 53, 0, 53, 3, 53, 0, 53, 0, 53, 3, 53, 0, 26, '2026-10-23 03:00:00+00'),
	(72, '2026-10-23', 'D30', '2026-10-04', 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 53, 0, 0, '2026-10-23 03:00:00+00'),
	(73, '2026-10-23', 'D30', '2026-10-05', 53, 25, 53, 5, 53, 3, 53, 5, 53, 2, 53, 5, 53, 0, 53, 0, 53, 23, 53, 4, 53, 3, 53, 23, 53, 6, 321, '2026-10-23 03:00:00+00'),
	(74, '2026-10-23', 'D30', '2026-10-06', 53, 23, 53, 6, 53, 9, 53, 5, 53, 3, 53, 4, 53, 2, 53, 0, 53, 20, 53, 1, 53, 7, 53, 20, 53, 7, 287, '2026-10-23 03:00:00+00'),
	(75, '2026-10-23', 'D30', '2026-10-07', 53, 21, 53, 6, 53, 7, 53, 1, 53, 7, 53, 4, 53, 3, 53, 0, 53, 21, 53, 5, 53, 3, 53, 21, 53, 5, 265, '2026-10-23 03:00:00+00'),
	(76, '2026-10-23', 'D30', '2026-10-08', 53, 27, 53, 6, 53, 6, 53, 7, 53, 7, 53, 3, 53, 2, 53, 0, 53, 25, 53, 8, 53, 3, 53, 25, 53, 5, 260, '2026-10-23 03:00:00+00'),
	(77, '2026-10-23', 'D30', '2026-10-09', 53, 25, 53, 8, 53, 5, 53, 5, 53, 6, 53, 5, 53, 2, 53, 0, 53, 24, 53, 7, 53, 5, 53, 24, 53, 7, 342, '2026-10-23 03:00:00+00'),
	(78, '2026-10-23', 'D30', '2026-10-10', 53, 2, 53, 1, 53, 0, 53, 0, 53, 1, 53, 0, 53, 0, 53, 0, 53, 2, 53, 1, 53, 0, 53, 2, 53, 1, 27, '2026-10-23 03:00:00+00'),
	(79, '2026-10-23', 'D30', '2026-10-11', 53, 1, 53, 0, 53, 1, 53, 1, 53, 0, 53, 1, 53, 0, 53, 0, 53, 1, 53, 0, 53, 1, 53, 1, 53, 0, 35, '2026-10-23 03:00:00+00'),
	(80, '2026-10-23', 'D30', '2026-10-12', 53, 25, 53, 7, 53, 4, 53, 1, 53, 8, 53, 3, 53, 1, 53, 0, 53, 23, 53, 4, 53, 8, 53, 23, 53, 8, 278, '2026-10-23 03:00:00+00'),
	(81, '2026-10-23', 'D30', '2026-10-13', 53, 24, 53, 7, 53, 8, 53, 8, 53, 6, 53, 6, 53, 0, 53, 0, 53, 21, 53, 1, 53, 6, 53, 21, 53, 5, 332, '2026-10-23 03:00:00+00'),
	(82, '2026-10-23', 'D30', '2026-10-14', 53, 22, 53, 3, 53, 5, 53, 1, 53, 7, 53, 3, 53, 1, 53, 0, 53, 20, 53, 5, 53, 2, 53, 20, 53, 5, 269, '2026-10-23 03:00:00+00'),
	(83, '2026-10-23', 'D30', '2026-10-15', 53, 24, 53, 9, 53, 4, 53, 7, 53, 6, 53, 6, 53, 0, 53, 1, 53, 22, 53, 4, 53, 4, 53, 22, 53, 6, 342, '2026-10-23 03:00:00+00'),
	(84, '2026-10-23', 'D30', '2026-10-16', 53, 25, 53, 4, 53, 7, 53, 8, 53, 6, 53, 7, 53, 1, 53, 1, 53, 25, 53, 6, 53, 8, 53, 25, 53, 7, 304, '2026-10-23 03:00:00+00'),
	(85, '2026-10-23', 'D30', '2026-10-17', 53, 1, 53, 0, 53, 1, 53, 0, 53, 1, 53, 1, 53, 0, 53, 0, 53, 1, 53, 0, 53, 0, 53, 1, 53, 1, 42, '2026-10-23 03:00:00+00'),
	(86, '2026-10-23', 'D30', '2026-10-18', 53, 1, 53, 1, 53, 1, 53, 0, 53, 1, 53, 0, 53, 0, 53, 0, 53, 1, 53, 0, 53, 0, 53, 1, 53, 1, 20, '2026-10-23 03:00:00+00'),
	(87, '2026-10-23', 'D30', '2026-10-19', 53, 21, 53, 6, 53, 4, 53, 8, 53, 2, 53, 4, 53, 1, 53, 0, 53, 19, 53, 4, 53, 4, 53, 19, 53, 2, 286, '2026-10-23 03:00:00+00'),
	(88, '2026-10-23', 'D30', '2026-10-20', 53, 23, 53, 9, 53, 4, 53, 2, 53, 6, 53, 6, 53, 3, 53, 0, 53, 22, 53, 6, 53, 2, 53, 22, 53, 11, 376, '2026-10-23 03:00:00+00'),
	(89, '2026-10-23', 'D30', '2026-10-21', 53, 22, 53, 8, 53, 5, 53, 6, 53, 3, 53, 4, 53, 2, 53, 0, 53, 20, 53, 4, 53, 3, 53, 20, 53, 4, 302, '2026-10-23 03:00:00+00'),
	(90, '2026-10-23', 'D30', '2026-10-22', 53, 21, 53, 6, 53, 4, 53, 3, 53, 6, 53, 4, 53, 1, 53, 0, 53, 20, 53, 5, 53, 3, 53, 20, 53, 5, 318, '2026-10-23 03:00:00+00');


-- Name: claude_user_cost_report_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -

SELECT pg_catalog.setval('public.claude_user_cost_report_id_seq', 1, false);


-- Name: claude_user_usage_report_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -

SELECT pg_catalog.setval('public.claude_user_usage_report_id_seq', 1, false);


-- Name: copilot_usage_user_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -

SELECT pg_catalog.setval('public.copilot_usage_user_detail_id_seq', 162, true);


-- Name: copilot_user_count_summary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -

SELECT pg_catalog.setval('public.copilot_user_count_summary_id_seq', 3, true);


-- Name: copilot_user_count_trend_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -

SELECT pg_catalog.setval('public.copilot_user_count_trend_id_seq', 90, true);
