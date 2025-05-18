-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 07, 2025 at 10:22 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `simulator_longsor`
--

-- --------------------------------------------------------

--
-- Table structure for table `simulations`
--

CREATE TABLE `simulations` (
  `id` int(10) UNSIGNED NOT NULL,
  `simulation_name` varchar(255) NOT NULL,
  `kelembaban_tanah_1` float NOT NULL,
  `kelembaban_tanah_2` float NOT NULL,
  `kelembaban_tanah_3` float NOT NULL,
  `kelembaban_tanah_4` float NOT NULL,
  `kelembaban_tanah_5` float NOT NULL,
  `kelembaban_tanah_6` float NOT NULL,
  `derajat_kemiringan` float NOT NULL,
  `output_kemiringan` float DEFAULT NULL,
  `curah_hujan` float NOT NULL,
  `output_curah_hujan` float DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `simulations`
--

INSERT INTO `simulations` (`id`, `simulation_name`, `kelembaban_tanah_1`, `kelembaban_tanah_2`, `kelembaban_tanah_3`, `kelembaban_tanah_4`, `kelembaban_tanah_5`, `kelembaban_tanah_6`, `derajat_kemiringan`, `output_kemiringan`, `curah_hujan`, `output_curah_hujan`, `created_at`, `is_active`) VALUES
(1, 'Simulasi Tanah Basah', 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-02-28 08:55:49', 0),
(2, 'Simulasi Tanah Basah', 0, 0, 0, 0, 0, 0, 15, NULL, 0, NULL, '2025-02-28 08:57:17', 0),
(3, 'Simulasi Tanah Basah', 0, 0, 0, 0, 0, 0, 15, NULL, 20, NULL, '2025-02-28 08:57:27', 0),
(4, 'Simulasi Tanah Basah', 0, 0, 0, 0, 0, 0, 15, NULL, 30, NULL, '2025-02-28 08:57:32', 0),
(5, 'Simulasi Tanah Lembab', 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-03-03 04:17:25', 0),
(6, 'Simulasi Tanah Lembab', 0, 0, 0, 0, 0, 0, 20, NULL, 0, NULL, '2025-03-03 04:17:30', 0),
(7, 'Simulasi Tanah Lembab', 0, 0, 0, 0, 0, 0, 20, NULL, 20, NULL, '2025-03-03 04:17:35', 0),
(8, 'Simulasi Tanah Lembab', 0, 0, 0, 0, 0, 0, 20, NULL, 25, NULL, '2025-03-03 04:17:39', 0),
(9, 'Simulasi Tanah Lembab', 0, 0, 0, 0, 0, 0, 10, NULL, 25, NULL, '2025-03-03 04:17:43', 0),
(10, 'Simulasi Tanah Lembab', 0, 0, 0, 0, 0, 0, 35, NULL, 25, NULL, '2025-03-03 04:17:47', 0),
(11, 'Simulasi Tanah Lembab', 0, 0, 0, 0, 0, 0, 35, NULL, 30, NULL, '2025-03-03 04:17:51', 0),
(12, 'Simulasi Tanah Kering', 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-03-03 04:18:38', 0),
(13, 'Simulasi Tanah Kering', 0, 0, 0, 0, 0, 0, 30, NULL, 0, NULL, '2025-03-03 04:18:44', 0),
(14, 'Simulasi Tanah Kering', 0, 0, 0, 0, 0, 0, 30, NULL, 10, NULL, '2025-03-03 04:18:48', 0),
(15, 'Simulasi Tanah Kering', 0, 0, 0, 0, 0, 0, 35, NULL, 10, NULL, '2025-03-03 04:18:52', 0),
(16, 'Simulasi Tanah Kering', 0, 0, 0, 0, 0, 0, 35, NULL, 15, NULL, '2025-03-03 04:18:56', 0),
(17, 'Simulasi Tanah Kering', 0, 0, 0, 0, 0, 0, 35, NULL, 20, NULL, '2025-03-03 04:19:00', 0),
(18, 'Simulasi Tanah Kering', 0, 0, 0, 0, 0, 0, 40, NULL, 20, NULL, '2025-03-03 04:19:06', 0),
(19, 'Simulasi Tanah Kering', 0, 0, 0, 0, 0, 0, 40, NULL, 25, NULL, '2025-03-03 04:19:15', 0),
(92, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 13:13:36', 0),
(93, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:13:44', 0),
(94, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.31, 0, NULL, '2025-04-24 13:13:46', 0),
(95, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.31, 0, NULL, '2025-04-24 13:13:48', 0),
(96, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 6.38, 0, NULL, '2025-04-24 13:13:50', 0),
(97, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 8.54, 0, NULL, '2025-04-24 13:13:52', 0),
(98, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 10.14, 0, NULL, '2025-04-24 13:13:54', 0),
(99, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.46, 0, NULL, '2025-04-24 13:13:56', 0),
(100, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 6.67, 0, NULL, '2025-04-24 13:13:59', 0),
(101, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 6.42, 0, NULL, '2025-04-24 13:14:00', 0),
(102, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 6.59, 0, NULL, '2025-04-24 13:14:02', 0),
(103, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 6.92, 0, NULL, '2025-04-24 13:14:04', 0),
(104, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.44, 0, NULL, '2025-04-24 13:14:06', 0),
(105, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.38, 0, NULL, '2025-04-24 13:14:08', 0),
(106, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.39, 0, NULL, '2025-04-24 13:14:10', 0),
(107, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 5, NULL, 0, NULL, '2025-04-24 13:14:13', 0),
(108, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.38, 0, NULL, '2025-04-24 13:14:12', 0),
(109, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.35, 0, NULL, '2025-04-24 13:14:14', 0),
(110, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.24, 0, NULL, '2025-04-24 13:14:16', 0),
(111, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.25, 0, NULL, '2025-04-24 13:14:18', 0),
(112, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.34, 0, NULL, '2025-04-24 13:14:20', 0),
(113, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.33, 0, NULL, '2025-04-24 13:14:22', 0),
(114, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.27, 0, NULL, '2025-04-24 13:14:24', 0),
(115, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.22, 0, NULL, '2025-04-24 13:14:26', 0),
(116, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 6.97, 0, NULL, '2025-04-24 13:14:28', 0),
(117, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.13, 0, NULL, '2025-04-24 13:14:30', 0),
(118, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 11.49, 0, NULL, '2025-04-24 13:14:32', 0),
(119, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 12.17, 0, NULL, '2025-04-24 13:14:34', 0),
(120, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 12.71, 0, NULL, '2025-04-24 13:14:36', 0),
(121, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 13.45, 0, NULL, '2025-04-24 13:14:38', 0),
(122, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 13.65, 0, NULL, '2025-04-24 13:14:40', 0),
(123, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 13.76, 0, NULL, '2025-04-24 13:14:42', 0),
(124, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 13.8, 0, NULL, '2025-04-24 13:14:44', 0),
(125, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 14.19, 0, NULL, '2025-04-24 13:14:46', 0),
(126, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 14.14, 0, NULL, '2025-04-24 13:14:50', 0),
(127, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 16.71, 0, NULL, '2025-04-24 13:14:52', 0),
(128, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 18.13, 0, NULL, '2025-04-24 13:14:54', 0),
(129, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 18.24, 0, NULL, '2025-04-24 13:14:56', 0),
(130, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 18.53, 0, NULL, '2025-04-24 13:14:58', 0),
(131, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 18.65, 0, NULL, '2025-04-24 13:15:00', 0),
(132, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 10, NULL, 0, NULL, '2025-04-24 13:15:00', 0),
(133, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 18.58, 0, NULL, '2025-04-24 13:15:02', 0),
(134, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 18.54, 0, NULL, '2025-04-24 13:15:04', 0),
(135, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 18.44, 0, NULL, '2025-04-24 13:15:06', 0),
(136, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 13.77, 0, NULL, '2025-04-24 13:15:08', 0),
(137, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.58, 0, NULL, '2025-04-24 13:15:10', 0),
(138, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 13:16:39', 0),
(139, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:16:42', 0),
(140, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 15, NULL, 0, NULL, '2025-04-24 13:16:43', 0),
(141, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.26, 0, NULL, '2025-04-24 13:16:44', 0),
(142, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:16:46', 0),
(143, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.27, 0, NULL, '2025-04-24 13:16:48', 0),
(144, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:16:50', 0),
(145, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:16:52', 0),
(146, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:16:54', 0),
(147, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:16:58', 0),
(148, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:17:00', 0),
(149, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:17:02', 0),
(150, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:17:04', 0),
(151, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.27, 0, NULL, '2025-04-24 13:17:06', 0),
(152, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.27, 0, NULL, '2025-04-24 13:17:10', 0),
(153, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:12', 0),
(154, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:14', 0),
(155, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:16', 0),
(156, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:17:18', 0),
(157, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:17:20', 0),
(158, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:22', 0),
(159, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:24', 0),
(160, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:26', 0),
(161, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:17:28', 0),
(162, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:30', 0),
(163, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:32', 0),
(164, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.27, 0, NULL, '2025-04-24 13:17:34', 0),
(165, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:17:36', 0),
(166, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:40', 0),
(167, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:17:42', 0),
(168, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.27, 0, NULL, '2025-04-24 13:17:44', 0),
(169, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.27, 0, NULL, '2025-04-24 13:17:46', 0),
(170, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:48', 0),
(171, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:17:50', 0),
(172, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:17:52', 0),
(173, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:17:54', 0),
(174, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:17:56', 0),
(175, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:17:58', 0),
(176, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.27, 0, NULL, '2025-04-24 13:18:00', 0),
(177, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:18:02', 0),
(178, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.27, 0, NULL, '2025-04-24 13:18:04', 0),
(179, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:18:08', 0),
(180, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:18:10', 0),
(181, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:18:12', 0),
(182, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:18:14', 0),
(183, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:18:16', 0),
(184, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:18:18', 0),
(185, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:18:20', 0),
(186, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.28, 0, NULL, '2025-04-24 13:18:22', 0),
(187, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.29, 0, NULL, '2025-04-24 13:18:24', 0),
(188, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:18:26', 0),
(189, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:18:28', 0),
(190, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:18:30', 0),
(191, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:18:32', 0),
(192, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 13:23:07', 0),
(193, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.34, 0, NULL, '2025-04-24 13:23:10', 0),
(194, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.39, 0, NULL, '2025-04-24 13:23:12', 0),
(195, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 6.32, 0, NULL, '2025-04-24 13:23:14', 0),
(196, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 8.87, 0, NULL, '2025-04-24 13:23:16', 0),
(197, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 8.19, 0, NULL, '2025-04-24 13:23:18', 0),
(198, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 4.48, 0, NULL, '2025-04-24 13:23:20', 0),
(199, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 9.56, 0, NULL, '2025-04-24 13:23:28', 0),
(200, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.32, 0, NULL, '2025-04-24 13:23:30', 0),
(201, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.3, 0, NULL, '2025-04-24 13:23:32', 0),
(202, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.34, 0, NULL, '2025-04-24 13:23:34', 0),
(203, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.34, 0, NULL, '2025-04-24 13:23:38', 0),
(204, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.35, 0, NULL, '2025-04-24 13:23:40', 0),
(205, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.36, 0, NULL, '2025-04-24 13:23:42', 0),
(206, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.36, 0, NULL, '2025-04-24 13:23:44', 0),
(207, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.31, 0, NULL, '2025-04-24 13:23:46', 0),
(208, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.27, 0, NULL, '2025-04-24 13:23:48', 0),
(209, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.25, 0, NULL, '2025-04-24 13:23:50', 0),
(210, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.25, 0, NULL, '2025-04-24 13:23:52', 0),
(211, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.25, 0, NULL, '2025-04-24 13:23:54', 0),
(212, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.25, 0, NULL, '2025-04-24 13:23:56', 0),
(213, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.24, 0, NULL, '2025-04-24 13:23:58', 0),
(214, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.25, 0, NULL, '2025-04-24 13:24:00', 0),
(215, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.26, 0, NULL, '2025-04-24 13:24:04', 0),
(216, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.26, 0, NULL, '2025-04-24 13:24:06', 0),
(217, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.26, 0, NULL, '2025-04-24 13:24:08', 0),
(218, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.27, 0, NULL, '2025-04-24 13:24:10', 0),
(219, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.25, 0, NULL, '2025-04-24 13:24:12', 0),
(220, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.26, 0, NULL, '2025-04-24 13:24:14', 0),
(221, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.36, 0, NULL, '2025-04-24 13:24:16', 0),
(222, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 17.09, 0, NULL, '2025-04-24 13:24:26', 0),
(223, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 0.6, 0, NULL, '2025-04-24 13:24:47', 0),
(224, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 3.02, 0, NULL, '2025-04-24 13:24:48', 0),
(225, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 3.43, 0, NULL, '2025-04-24 13:25:15', 0),
(226, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 5.84, 0, NULL, '2025-04-24 13:25:17', 0),
(227, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 7.44, 0, NULL, '2025-04-24 13:25:19', 0),
(228, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 9.27, 0, NULL, '2025-04-24 13:25:21', 0),
(229, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 11.14, 0, NULL, '2025-04-24 13:25:23', 0),
(230, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 1.17, 0, NULL, '2025-04-24 13:25:33', 0),
(231, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 1.11, 0, NULL, '2025-04-24 13:25:35', 0),
(232, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 1.1, 0, NULL, '2025-04-24 13:25:37', 0),
(233, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 1.1, 0, NULL, '2025-04-24 13:25:39', 0),
(234, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 1.08, 0, NULL, '2025-04-24 13:25:41', 0),
(235, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 5.22, 0, NULL, '2025-04-24 13:25:43', 0),
(236, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 10.91, 0, NULL, '2025-04-24 13:25:47', 0),
(237, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 10.91, 0, NULL, '2025-04-24 13:25:49', 0),
(238, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 10.91, 0, NULL, '2025-04-24 13:25:51', 0),
(239, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 10.91, 0, NULL, '2025-04-24 13:25:53', 0),
(240, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 10.91, 0, NULL, '2025-04-24 13:25:55', 0),
(241, 'cobakemiringan', 0, 0, 0, 0, 0, 0, 0, 10.91, 0, NULL, '2025-04-24 13:25:57', 0),
(405, 'cobakelembapan', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '2025-04-24 22:38:12', 0),
(406, 'cobakelembapan', 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 22:38:09', 0),
(407, 'cobakelembapan', 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 22:38:25', 0),
(408, 'cobakelembapan', 52.39, 74.13, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 22:38:42', 0),
(409, 'cobakelembapan', 50.88, 72.89, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 22:38:58', 0),
(410, 'cobakelembapan', 49.97, 74.06, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 22:39:14', 0),
(411, 'cobakelembapan', 0, 0, 0, 0, 44.8, 49.6, 0, NULL, 0, NULL, '2025-04-24 22:39:30', 0),
(412, 'cobakelembapan', 0, 0, 0, 0, 43.26, 47.84, 0, NULL, 0, NULL, '2025-04-24 22:39:47', 0),
(413, 'cobakelembapan', 0, 0, 0, 0, 42.58, 47.16, 0, NULL, 0, NULL, '2025-04-24 22:40:05', 0),
(414, 'cobakelembapan', 0, 82.51, 0, 57.33, 0, 0, 0, NULL, 0, NULL, '2025-04-24 22:40:19', 0),
(415, 'cobakelembapan', 0, 82.51, 0, 53.09, 0, 0, 0, NULL, 0, NULL, '2025-04-24 22:40:35', 0),
(416, 'cobakelembapan', 0, 0, 55.7, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 22:40:52', 0),
(417, 'cobakelembapan', 0, 0, 51.3, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 22:41:08', 0),
(660, 'mimpio', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '2025-04-30 11:36:59', 0),
(661, 'mimpio', 0, 0, 0, 0, 0, 0, 0, 5.11, 0, NULL, '2025-04-30 11:35:15', 0),
(662, 'mimpio', 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '2025-04-24 22:41:57', 0),
(663, 'mimpio', 0, 0, 0, 0, 0, 0, 0, 5.11, 0, NULL, '2025-04-30 11:35:15', 0),
(664, 'mimpio', 0, 0, 0, 0, 0, 0, 0, 5.11, 0, NULL, '2025-04-30 11:35:15', 0),
(665, 'mimpio', 0, 0, 0, 0, 0, 0, 0, 5.11, 0, NULL, '2025-04-30 11:35:15', 0),
(666, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, '2025-04-30 11:37:11', 0),
(667, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 0, 0, NULL, '2025-04-30 11:37:12', 0),
(668, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 4.23, 0, NULL, '2025-04-30 11:37:27', 0),
(669, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 9.04, 0, NULL, '2025-04-30 11:37:39', 0),
(670, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 10.47, 0, NULL, '2025-04-30 11:37:43', 0),
(671, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 12.21, 0, NULL, '2025-04-30 11:37:47', 0),
(672, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 13.37, 0, NULL, '2025-04-30 11:37:49', 0),
(673, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 15.14, 0, NULL, '2025-04-30 11:37:53', 0),
(674, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 16.29, 0, NULL, '2025-04-30 11:37:57', 0),
(675, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 14.89, 0, NULL, '2025-04-30 11:37:59', 0),
(676, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 18.21, 0, NULL, '2025-04-30 11:38:03', 0),
(677, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 17.84, 0, NULL, '2025-04-30 11:38:05', 0),
(678, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 17.84, 0, NULL, '2025-04-30 11:38:05', 0),
(679, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 17.84, 0, NULL, '2025-04-30 11:38:05', 0),
(680, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 17.84, 0, NULL, '2025-04-30 11:38:05', 0),
(681, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 17.84, 0, NULL, '2025-04-30 11:38:05', 0),
(682, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 9.41, 0, NULL, '2025-04-30 11:38:21', 0),
(683, 'mimpio', 0, 0, 0, 0, 0, 0, 5, 8.6, 0, NULL, '2025-04-30 11:38:23', 0);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `account_type` enum('admin','user') NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `account_type`, `created_at`) VALUES
(1, 'Admin', 'admin@gmail.com', '$2y$10$LrbX4E9.m5kNjbrQTY9sjOHZSh8TTYRKZyOLufqUT4pxX1VLFbW1a', 'admin', '2025-02-28 08:53:55'),
(2, 'Tester 1', 'user@gmail.com', '$2y$10$Kx5E.7aJp4Rr6.RE42MTIuIvuzCciucqnQwHR3l.7aPe/ayLPV5v.', 'user', '2025-02-28 08:54:35'),
(3, 'Tester 2', 'users2@gmail.com', '$2y$10$t5bkqskxQc0NXS4Su9.C/uJ2nBkYhmgSMps/WjEeqA4R/jEj8ZMVO', 'user', '2025-03-03 04:16:00'),
(4, 'Tester 3', 'users3@gmail.com', '$2y$10$AlJ8RTdr5r/dN8JHzyeFFu/CW5SCW7/lpVM8Sx.Exw54jiqwOZFYG', 'user', '2025-03-03 04:16:43'),
(5, 'Tester 4', 'users4@gmail.com', '$2y$10$dn9kvDpB70TPK.jsT6PAyuuFSTOIDgBs.jtrvLFt5a7QwYG04pzdq', 'user', '2025-03-03 04:46:24');

-- --------------------------------------------------------

--
-- Table structure for table `user_simulation_access`
--

CREATE TABLE `user_simulation_access` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `simulation_id` int(10) UNSIGNED NOT NULL,
  `granted_by` int(10) UNSIGNED DEFAULT NULL,
  `granted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_simulation_access`
--

INSERT INTO `user_simulation_access` (`id`, `user_id`, `simulation_id`, `granted_by`, `granted_at`) VALUES
(1, 2, 4, 1, '2025-02-28 08:57:59'),
(2, 3, 11, 1, '2025-03-03 04:18:15'),
(3, 4, 19, 1, '2025-03-03 04:19:27'),
(4, 2, 19, 1, '2025-04-22 07:21:17'),
(5, 2, 241, 1, '2025-04-28 10:43:46'),
(6, 2, 417, 1, '2025-04-28 10:43:51');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `simulations`
--
ALTER TABLE `simulations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_simulation_access`
--
ALTER TABLE `user_simulation_access`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_user` (`user_id`),
  ADD KEY `fk_simulation` (`simulation_id`),
  ADD KEY `fk_granted_by` (`granted_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `simulations`
--
ALTER TABLE `simulations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=684;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `user_simulation_access`
--
ALTER TABLE `user_simulation_access`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `user_simulation_access`
--
ALTER TABLE `user_simulation_access`
  ADD CONSTRAINT `fk_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_simulation` FOREIGN KEY (`simulation_id`) REFERENCES `simulations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
