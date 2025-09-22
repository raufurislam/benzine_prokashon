/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { Book, ShoppingCart, FileText, AlertCircle } from "lucide-react";
import useAxiosPublic from "../../Hooks/useAxiosPublic";
import { useParams } from "react-router-dom";
import { useCart } from "../../Provider/CartContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { Skeleton } from "../../components/ui/skeleton";

const PDF_WORKER_URL =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const BookDetails = () => {
  const axiosPublic = useAxiosPublic();
  const { id } = useParams();
  const { addToCart } = useCart();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfLoadSuccess, setPdfLoadSuccess] = useState(false);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        const response = await axiosPublic.get(`/books/${id}`);
        console.log(response);
        setBook(response.data);
      } catch (err) {
        console.error("Error fetching book details:", err);
        setError("Failed to load book details.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [axiosPublic, id]);

  // PDF load handlers
  const handlePdfLoad = () => {
    console.log("PDF loaded successfully");
    setPdfLoading(false);
    setPdfError("");
    setPdfLoadSuccess(true);
  };

  const handlePdfError = (error) => {
    console.error("PDF Error:", error);
    const errorMessage = error?.message || "Failed to load PDF preview";

    if (
      errorMessage.includes("Invalid PDF structure") ||
      errorMessage.includes("PDFException")
    ) {
      setPdfError("PDF file format is not supported. Please contact support.");
    } else if (
      errorMessage.includes("NetworkError") ||
      errorMessage.includes("Failed to fetch")
    ) {
      setPdfError("Unable to load PDF. Please check your internet connection.");
    } else {
      setPdfError(`${errorMessage}. Please try again.`);
    }

    setPdfLoading(false);
    setPdfLoadSuccess(false);
  };

  // PDF viewer configuration
  const viewerOptions = useMemo(
    () => ({
      cMapUrl: "https://unpkg.com/pdfjs-dist@3.11.174/cmaps/",
      cMapPacked: true,
      standardFontDataUrl:
        "https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/",
      enableXfa: false,
      disableTextLayer: false,
      disableAnnotationLayer: true,
      renderTextLayer: true,
      useOnlyCssZoom: true,
    }),
    []
  );

  // Simplified modal open handler
  const handleOpenPreview = () => {
    console.log("Opening preview modal");
    if (!book?.bookPdf) {
      setPdfError("No preview available for this book.");
      return;
    }

    // Reset states
    setPdfLoading(true);
    setPdfError("");
    setPdfLoadSuccess(false);
    setOpen(true);
  };

  // Close modal handler
  const handleCloseModal = () => {
    console.log("Closing modal");
    setOpen(false);
    // Reset states only when closing
    setPdfError("");
    setPdfLoading(false);
    setPdfLoadSuccess(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 mt-32 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Skeleton className="w-full max-w-sm aspect-[3/4] rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4 rounded" />
            <Skeleton className="h-6 w-1/2 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-10 w-32 rounded" />
            <Skeleton className="h-10 w-32 rounded" />
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl shadow-sm space-y-2">
          <Skeleton className="h-6 w-1/3 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/6 rounded" />
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg font-semibold text-red-600">
          {error || "Book not found."}
        </p>
      </div>
    );
  }

  // Calculate discounted price safely
  let discountedPrice = book.listPrice;
  if (book.discountType === "percentage") {
    discountedPrice = (book.listPrice * (100 - book.discountValue)) / 100;
  } else if (book.discountType === "flat") {
    discountedPrice = book.listPrice - book.discountValue;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 mt-32">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Book Cover */}
        <div className="flex justify-center items-start px-16">
          <div className="w-full border shadow-md overflow-hidden rounded-lg">
            <img
              src={book?.coverImage}
              alt={book?.productNameEn}
              className="w-full h-auto object-contain"
              onError={(e) => {
                e.target.src = "/placeholder-book.jpg";
              }}
            />
          </div>
        </div>

        {/* Book Info */}
        <div className="flex flex-col justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{book?.productNameBn}</h1>
            <h2 className="text-lg md:text-xl text-gray-600 mb-4">
              {book?.subtitle}
            </h2>

            <div className="mb-6 space-y-2 text-gray-700">
              <p>
                <span className="font-semibold">Author:</span>{" "}
                {book?.authorName}
              </p>
              {book?.translatorName && (
                <p>
                  <span className="font-semibold">Translator:</span>{" "}
                  {book?.translatorName}
                </p>
              )}
              <p>
                <span className="font-semibold">Pages:</span> {book?.pages}
              </p>
              <p>
                <span className="font-semibold">ISBN:</span> {book?.isbn}
              </p>
              <p>
                <span className="font-semibold">Genres:</span>{" "}
                {book?.genres?.join(", ")}
              </p>
            </div>

            {/* Price */}
            <div className="mb-6 flex items-center gap-4">
              {book?.discountType && book?.discountValue > 0 ? (
                <>
                  <span className="text-2xl font-bold text-blue-600">
                    ৳{discountedPrice.toFixed(2)}
                  </span>
                  <span className="line-through text-gray-400">
                    ৳{book?.listPrice.toFixed(2)}
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">
                    {book?.discountValue}
                    {book?.discountType === "percentage" ? "%" : " ৳"} OFF
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-blue-600">
                  ৳{book?.listPrice}
                </span>
              )}
            </div>

            {/* Stock */}
            <p
              className={`mb-6 font-semibold ${
                book?.stock > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {book?.stock > 0
                ? `${book?.stock} copies available`
                : "Out of stock"}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => addToCart(book)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-400 text-white font-medium rounded-xl shadow-md hover:bg-blue-500 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={book?.stock <= 0}
              >
                <ShoppingCart size={20} /> Add to Cart
              </button>
              <button
                onClick={handleOpenPreview}
                disabled={!book.bookPdf}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 font-medium rounded-xl shadow-md hover:bg-gray-100 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <FileText size={20} />
                {book.bookPdf ? "একটু পড়ে দেখুন" : "Preview Unavailable"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-12 bg-gray-50 p-6 rounded-xl shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Book Description</h3>
        <div
          className="prose max-w-none text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: book?.description }}
        />
      </div>

      {/* PDF Preview Modal - FIXED */}
      <Dialog open={open} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-6xl h-[85vh] p-0 max-h-[90vh]">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <FileText size={20} />
                বইয়ের অংশ পড়ুন - {book?.productNameBn}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Page navigation and zoom controls available below
              </DialogDescription>
            </div>
            <button
              onClick={handleCloseModal}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition"
              aria-label="Close preview"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </DialogHeader>

          <div className="h-full w-full relative bg-gray-50">
            {/* Show PDF Viewer when we have a PDF URL */}
            {book?.bookPdf ? (
              <div className="h-full w-full">
                <Worker workerUrl={PDF_WORKER_URL}>
                  <Viewer
                    fileUrl={book.bookPdf}
                    onDocumentLoadSuccess={handlePdfLoad}
                    onError={handlePdfError}
                    options={viewerOptions}
                  />
                </Worker>
              </div>
            ) : (
              /* Show no preview message when no PDF */
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Book className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No preview available</p>
                  <p className="text-sm text-gray-400 mt-1">
                    PDF preview is not available for this book
                  </p>
                </div>
              </div>
            )}

            {/* Loading Overlay - Show only when loading */}
            {pdfLoading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">
                    Loading PDF preview...
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Please wait while we process the document
                  </p>
                </div>
              </div>
            )}

            {/* Error Overlay - Show only when there's an error */}
            {pdfError && !pdfLoading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="text-center p-6 max-w-md bg-white rounded-lg shadow-lg">
                  <div className="flex justify-center mb-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Preview Error
                  </h3>
                  <p className="text-gray-600 mb-6">{pdfError}</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setPdfLoading(true);
                        setPdfError("");
                        setPdfLoadSuccess(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookDetails;
