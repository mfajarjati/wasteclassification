"use client";

import { useState, useRef, useEffect } from "react";
import { predictImage } from "@/lib/model";
import * as tf from "@tensorflow/tfjs";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Footer } from "../components_home/footer";
import { motion, AnimatePresence } from "framer-motion";

export default function WasteClassificationPage() {
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [points, setPoints] = useState(0);
  const [showPointAnimation, setShowPointAnimation] = useState(false);
  const [result, setResult] = useState<{
    type: string;
    confidence: number;
    description: string;
    examples?: string;
    impact?: string;
    points?: number;
  } | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [uploadCount, setUploadCount] = useState(0);
  const [lastUploadTime, setLastUploadTime] = useState<number | null>(() => {
    const saved = localStorage.getItem("lastUploadTime");
    return saved ? Number(saved) : null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const wasteTypes = {
    organik: {
      description: "Sampah yang dapat terurai secara alami.",
      examples: "Sisa makanan, dedaunan, sayuran",
      impact: "Dapat diolah menjadi pupuk kompos",
      points: 500,
    },
    b3: {
      description: "Sampah berbahaya dan beracun.",
      examples: "Baterai, lampu, elektronik",
      impact: "Memerlukan penanganan khusus",
      points: 1500,
    },
    anorganik: {
      description: "Sampah yang tidak dapat terurai secara alami.",
      examples: "Plastik, kaleng, botol",
      impact: "Dapat didaur ulang menjadi produk baru",
      points: 1000,
    },
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsLoading(true);

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      setImage(base64);

      const response = await predictImage(base64);
      console.log("API Response:", response);

      if (response.predictions && response.predictions.length > 0) {
        const bestPrediction = response.predictions[0];

        const now = Date.now();
        setStreakCount((prev) => {
          const newStreak = prev + 1;
          localStorage.setItem("streakCount", String(newStreak));
          return newStreak;
        });
        setLastUploadTime(now);
        localStorage.setItem("lastUploadTime", String(now));

        // Fixed points mapping
        const mockPoints = {
          organik: 500,
          b3: 1500,
          anorganik: 1000,
        } as const;

        const classKey =
          bestPrediction.class.toLowerCase() as keyof typeof mockPoints;
        const earnedPoints = mockPoints[classKey] || 0;

        // Update points first
        const newTotalPoints = totalPoints + earnedPoints;
        setTotalPoints(newTotalPoints);

        // Calculate earnings based on new total
        const newEarnings = newTotalPoints * 0.1; // 10% of total points
        setTotalEarnings(newEarnings);

        // Rest of the result setting code...
        setResult({
          type: classKey.charAt(0).toUpperCase() + classKey.slice(1),
          confidence: bestPrediction.confidence * 100,
          description: wasteTypes[classKey].description,
          examples: wasteTypes[classKey].examples,
          impact: wasteTypes[classKey].impact,
          points: earnedPoints,
        });

        setPoints(earnedPoints);
        setShowPointAnimation(true);
        setTimeout(() => setShowPointAnimation(false), 3000);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          handleImageUpload(
            new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
          );
        }
      }, "image/jpeg");
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#034833]/5 to-[#034833]/10">
      {/* <Navbar /> */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto pt-10 px-4"
      >
        {/* Hero Section */}
        <div className="text-center mb-2 space-y-4">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-block"
          >
            <div className="bg-white/30 backdrop-blur-sm rounded-full px-6 py-2 mb-4 inline-flex items-center space-x-4">
              <div className="flex items-center">
                <Sparkles className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="font-medium">Points: {totalPoints}</span>
              </div>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-medium">
                  Rp {totalEarnings.toLocaleString()}
                </span>
              </div>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center">
                <div className="text-amber-500 mr-2">🔥</div>
                <span className="font-medium">Streak: {streakCount}x</span>
              </div>
            </div>
          </motion.div>
          <h1 className="text-4xl font-bold text-[#034833] mb-4">
            Klasifikasi Jenis Sampah
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Coba klasifikasikan sampahmu dan lihat berapa points yang bisa kamu
            dapatkan!
          </p>
        </div>

        {/* Cards Grid */}
        <div
          className={cn(
            "grid gap-8 p-6",
            result ? "md:grid-cols-3" : "place-items-center"
          )}
        >
          {/* Upload Card - Column 1 */}
          <motion.div
            layout
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={cn(
              result ? "" : "md:w-[400px]" // Limit width when alone
            )}
          >
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
              <CardContent className="p-6 relative">
                {isCameraActive ? (
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 space-x-4">
                      <Button
                        onClick={captureImage}
                        className="bg-[#034833] hover:bg-[#034833]/90"
                      >
                        Ambil Foto
                      </Button>
                      <Button onClick={stopCamera} variant="outline">
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                      isDragging
                        ? "border-[#034833] bg-[#034833]/5"
                        : "border-gray-300",
                      image && "border-none p-0"
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith("image/")) {
                        handleImageUpload(file);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {image ? (
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden">
                        <Image
                          src={image}
                          alt="Uploaded"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-20 h-20 rounded-full bg-[#034833]/10 flex items-center justify-center mx-auto">
                          <Upload className="h-10 w-10 text-[#034833]" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-[#034833]">
                            Upload Gambar Sampah
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Drag & drop atau klik untuk memilih gambar
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />

                {image && isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10 overflow-hidden"
                  >
                    {/* Scanning Animation */}
                    <div className="relative w-full h-full">
                      {/* Scanning Line */}
                      <motion.div
                        initial={{ y: 0 }}
                        animate={{
                          y: ["0%", "100%", "0%"],
                        }}
                        transition={{
                          duration: 2,
                          ease: "linear",
                          repeat: Infinity,
                        }}
                        className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#034833] to-transparent"
                      />

                      {/* Corner Borders */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#034833]" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#034833]" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#034833]" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#034833]" />

                      {/* Loading Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.div
                          animate={{
                            opacity: [1, 0.5, 1],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                          }}
                          className="text-center relative w-full h-full"
                        >
                          {/* Scanning line animation */}
                          <motion.div
                            className="absolute left-0 right-0 h-12 bg-gradient-to-b from-transparent via-[#034833]/20 to-transparent"
                            animate={{
                              y: [-50, 200, -50],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />

                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-[#034833] mx-auto mb-3" />
                            <p className="text-[#034833] font-medium">
                              Menganalisis Sampah...
                            </p>
                            <p className="text-sm text-[#034833]/70 mt-1">
                              Mohon tunggu sebentar
                            </p>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {image && (
                  <Button
                    onClick={handleReset}
                    className="mt-4 bg-[#034833] hover:bg-[#034833]/90 w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Upload Lagi?"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Result Card - Column 2 */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-[#034833] mb-6 flex items-center">
                      <span className="bg-[#034833] w-1 h-6 mr-3 rounded-full" />
                      Hasil Klasifikasi
                    </h2>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="space-y-6"
                    >
                      {/* Result Content */}
                      <div className="p-6 rounded-xl bg-gradient-to-br from-[#034833]/5 to-[#034833]/10 border border-[#034833]/20 mb-3">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xl font-semibold text-[#034833]">
                            {result.type}
                          </span>
                          <span className="px-4 py-1 bg-[#034833] text-white rounded-full text-sm">
                            {result.confidence.toFixed(1)}% yakin
                          </span>
                        </div>
                        <p className="text-gray-600">{result.description}</p>
                      </div>
                    </motion.div>
                    {/* Rewards Section */}
                    <motion.div
                      className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl"
                      whileHover={{ scale: 1.02 }}
                    >
                      <h3 className="font-semibold text-green-800 mb-4 flex items-center">
                        <Sparkles className="h-5 w-5 mr-2 text-green-600" />
                        Potensi Rewards
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Points</span>
                          <span className="text-lg font-bold text-green-800">
                            +{points}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Nilai Tukar</span>
                          <span className="font-medium text-green-800">
                            Rp {(points / 10).toLocaleString("id-ID")}
                          </span>
                        </div>
                        {/* <div className="mt-4 p-4 bg-white rounded-lg">
                          <span className="text-green-700 font-semibold block mb-2">
                            Tahukah Kamu?
                          </span>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {result.type === "Organik"
                              ? "Sampah organik dapat terurai dalam 2-4 minggu jika dikompos dengan benar. Proses pengomposan menghasilkan nutrisi penting seperti nitrogen, fosfor, dan kalium yang sangat baik untuk pertumbuhan tanaman."
                              : result.type === "Anorganik"
                              ? "Sampah plastik membutuhkan 400-1000 tahun untuk terurai secara alami. Daur ulang 1 ton plastik dapat menghemat 7.4 barel minyak bumi dan mengurangi emisi CO2 hingga 1.5-2 ton."
                              : "Limbah B3 mengandung zat berbahaya yang dapat mencemari tanah dan air tanah hingga 10-100 tahun. Penanganan yang tepat dapat mencegah pencemaran lingkungan dan melindungi kesehatan masyarakat."}
                          </p>
                        </div> */}
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rewards & Info Card - Column 3 */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
                  <CardContent className="p-6 space-y-6">
                    {/* CTA Section */}
                    <motion.div
                      className="bg-blue-50 p-6 rounded-xl"
                      whileHover={{ scale: 1.02 }}
                    >
                      <h3 className="font-semibold text-blue-800 mb-2">
                        Mau menukar pointmu dengan uang?
                      </h3>
                      <p className="text-blue-600 mb-4">
                        Kunjungi segera lokasi Kantor Trash Transform dan
                        download aplikasi kami untuk mulai mengumpulkan point
                        dan menukarkannya dengan uang tunai!
                      </p>
                      <div className="grid grid-cols-1 gap-4">
                        <Button
                          onClick={() =>
                            window.open(
                              "https://maps.app.goo.gl/iqHJzCTUQEPj6kjW9",
                              "_blank"
                            )
                          }
                          className="bg-blue-600 hover:bg-blue-700 w-full"
                        >
                          Lihat Lokasi
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700 w-full">
                          Download Aplikasi
                        </Button>
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {result && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl mb-20">
              <CardContent className="p-6">
                <motion.div
                  className="bg-gradient-to-br from-blue-50 to-green-50 p-6 rounded-xl border border-green-100"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Sparkles className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-800">
                      Tahukah Kamu?
                    </h3>
                  </div>

                  {(() => {
                    const organikFacts = [
                      "Sampah organik dapat terurai dalam 2-4 minggu jika dikompos dengan benar dan menghasilkan nutrisi penting untuk tanaman.",
                      "Satu kilogram sampah organik dapat menghasilkan sekitar 300 gram pupuk kompos berkualitas tinggi.",
                      "Pengomposan sampah organik dapat mengurangi volume sampah hingga 70% dari volume awal.",
                      "Mikroorganisme dalam kompos membantu memperbaiki struktur tanah dan meningkatkan kesuburan.",
                      "Pengomposan skala rumah tangga dapat mengurangi emisi gas rumah kaca setara dengan 243 kg CO2 per tahun.",
                    ];

                    const anorganikFacts = [
                      "Sampah plastik membutuhkan 400-1000 tahun untuk terurai dan daur ulang 1 ton plastik menghemat 7.4 barel minyak.",
                      "Setiap tahun, lebih dari 8 juta ton plastik berakhir di lautan, membahayakan lebih dari 600 spesies laut.",
                      "Daur ulang satu botol plastik dapat menghemat energi yang cukup untuk menyalakan lampu LED selama 3 jam.",
                      "Aluminium dapat didaur ulang tanpa batas dan menghemat 95% energi dibanding produksi baru.",
                      "Daur ulang kertas dapat menyelamatkan 17 pohon dan 7000 galon air untuk setiap ton kertas.",
                    ];

                    const b3Facts = [
                      "Limbah B3 dapat mencemari tanah dan air tanah hingga 10-100 tahun jika tidak ditangani dengan benar.",
                      "Satu baterai bekas dapat mencemari 600.000 liter air tanah jika tidak didaur ulang dengan tepat.",
                      "Lampu LED mengandung merkuri yang dapat merusak sistem saraf jika terpapar langsung.",
                      "Elektronik bekas mengandung logam berat yang dapat direcycle hingga 90% komponennya.",
                      "Penanganan B3 yang tepat dapat menghemat sumber daya alam dan mencegah kerusakan lingkungan jangka panjang.",
                    ];

                    const facts =
                      result.type === "Organik"
                        ? organikFacts
                        : result.type === "Anorganik"
                        ? anorganikFacts
                        : b3Facts;

                    const randomFact =
                      facts[Math.floor(Math.random() * facts.length)];

                    return (
                      <div className="bg-white/80 p-4 rounded-lg border border-green-100">
                        <p className="text-gray-700 leading-relaxed">
                          {randomFact}
                        </p>
                      </div>
                    );
                  })()}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Point Animation */}
      <AnimatePresence>
        {showPointAnimation && (
          <motion.div
            initial={{ scale: 0.5, y: 0, opacity: 0 }}
            animate={{ scale: 1, y: -20, opacity: 1 }}
            exit={{ scale: 0.5, y: -40, opacity: 0 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full shadow-lg text-lg font-bold">
              +{points} Points! 🎉
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}
