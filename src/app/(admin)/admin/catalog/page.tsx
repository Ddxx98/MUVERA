'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product, Variant, SizeOption } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { siteConfig } from '@/config/site';
import {
  Plus,
  CheckCircle,
  Upload,
  X,
  Star,
  Layers,
  Boxes,
  Images,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  ExternalLink,
  FolderPlus,
  Tag,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; image?: string; count?: number }[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [uploadingCatImage, setUploadingCatImage] = useState(false);
  const catFileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ total: number; successCount: number; failureCount: number; results: any[] } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const bulkHelperPhotosRef = useRef<HTMLInputElement>(null);
  const [bulkHelperPhotos, setBulkHelperPhotos] = useState<string[]>([]);
  const [uploadingBulkHelper, setUploadingBulkHelper] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('MUVERA');
  const [category, setCategory] = useState('Oversized Tees');
  const [mrp, setMrp] = useState(2999);
  const [sellingPrice, setSellingPrice] = useState(1799);
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [skuPrefix, setSkuPrefix] = useState('');

  // Per-size SKU & initial stock configuration
  const [sizeConfig, setSizeConfig] = useState<{ [sz: string]: { enabled: boolean; stock: number } }>({
    S: { enabled: true, stock: 10 },
    M: { enabled: true, stock: 15 },
    L: { enabled: true, stock: 20 },
    XL: { enabled: true, stock: 10 },
    XXL: { enabled: false, stock: 5 },
  });

  // Cloudinary upload state
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch {
      // Fallback
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
        if (!category && data.categories[0]) {
          setCategory(data.categories[0].name);
        }
      } else {
        setCategories(siteConfig.categories.map((c, i) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image, count: c.count })));
      }
    } catch {
      setCategories(siteConfig.categories.map((c, i) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image, count: c.count })));
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBrand, setEditBrand] = useState('MUVERA');
  const [editCategory, setEditCategory] = useState('Oversized Tees');
  const [editMrp, setEditMrp] = useState(2999);
  const [editSellingPrice, setEditSellingPrice] = useState(1799);
  const [editDescription, setEditDescription] = useState('');
  const [editFabricDetails, setEditFabricDetails] = useState('');
  const [editIsBlitzDrop, setEditIsBlitzDrop] = useState(false);
  const [editIsDealOfTheHour, setEditIsDealOfTheHour] = useState(false);
  const [editImages, setEditImages] = useState<{ url: string; alt: string; order: number }[]>([]);
  const [editVariants, setEditVariants] = useState<any[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [uploadingEditImages, setUploadingEditImages] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Delete Product State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setEditTitle(p.title);
    setEditBrand(p.brand);
    setEditCategory(p.category);
    setEditMrp(p.mrpPaise ? Math.round(p.mrpPaise / 100) : 2999);
    setEditSellingPrice(p.sellingPricePaise ? Math.round(p.sellingPricePaise / 100) : 1799);
    setEditDescription(p.description || '');
    setEditFabricDetails(p.fabricDetails || '');
    setEditIsBlitzDrop(!!p.isBlitzDrop);
    setEditIsDealOfTheHour(!!p.isDealOfTheHour);
    setEditImages(
      p.images
        ? p.images.map((img, i) => ({
            url: img.url,
            alt: img.alt || p.title,
            order: typeof img.order === 'number' ? img.order : i,
          }))
        : []
    );
    setEditVariants(
      p.variants
        ? p.variants.map((v) => ({
            ...v,
            price: v.pricePaise ? Math.round(v.pricePaise / 100) : Math.round(p.sellingPricePaise / 100),
            mrp: v.mrpPaise ? Math.round(v.mrpPaise / 100) : Math.round(p.mrpPaise / 100),
            stock: (v as any).stock ?? 10,
          }))
        : []
    );
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEdit(true);
    setEditError('');

    try {
      const mrpPaise = Math.round(Number(editMrp) * 100);
      const sellingPricePaise = Math.round(Number(editSellingPrice) * 100);
      const discountPercentage =
        mrpPaise > sellingPricePaise
          ? Math.round(((mrpPaise - sellingPricePaise) / mrpPaise) * 100)
          : 0;

      const updatedPayload: Product = {
        ...editingProduct,
        title: editTitle,
        brand: editBrand,
        brandSlug: editBrand.toLowerCase().replace(/\s+/g, '-'),
        category: editCategory,
        categorySlug: editCategory.toLowerCase().replace(/\s+/g, '-'),
        description: editDescription,
        fabricDetails: editFabricDetails,
        mrpPaise,
        sellingPricePaise,
        discountPercentage,
        isBlitzDrop: editIsBlitzDrop,
        isDealOfTheHour: editIsDealOfTheHour,
        images:
          editImages.length > 0
            ? editImages.map((img, i) => ({
                url: img.url,
                alt: img.alt || `${editTitle} view ${i + 1}`,
                order: typeof img.order === 'number' ? img.order : i,
              }))
            : editingProduct.images,
        variants: editVariants.map((v) => ({
          ...v,
          pricePaise: v.price ? Math.round(Number(v.price) * 100) : sellingPricePaise,
          mrpPaise: v.mrp ? Math.round(Number(v.mrp) * 100) : mrpPaise,
          stock: typeof v.stock === 'number' ? v.stock : 10,
        })),
      };

      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update product');

      // Update state in place
      setProducts((prev) =>
        prev.map((item) => (item.id === editingProduct.id ? data.product || updatedPayload : item))
      );
      setFeedback(`✅ Product "${editTitle}" updated successfully!`);
      setTimeout(() => setFeedback(''), 4000);
      setEditingProduct(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to save product');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditImagesUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setUploadingEditImages(true);

    try {
      const sigRes = await fetch('/api/admin/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: 'muvera/products',
          adminSecret: 'muvera_admin_master_secret_2026',
        }),
      });
      const sig = await sigRes.json();
      if (!sig.success) throw new Error(sig.error || 'Signature generation failed');

      const uploadPromises = fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', sig.apiKey);
        formData.append('timestamp', String(sig.timestamp));
        formData.append('signature', sig.signature);
        formData.append('folder', sig.folder);

        const upRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const d = await upRes.json();
        return d.secure_url || d.url;
      });

      const urls = await Promise.all(uploadPromises);
      const newItems = urls.filter(Boolean).map((url, i) => ({
        url,
        alt: `${editTitle} photo`,
        order: editImages.length + i,
      }));
      setEditImages((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      setEditError(err.message || 'Image upload failed');
    } finally {
      setUploadingEditImages(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/products?id=${deletingProduct.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete product');

      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      setFeedback(`🗑️ Product "${deletingProduct.title}" deleted permanently!`);
      setTimeout(() => setFeedback(''), 4000);
      setDeletingProduct(null);
    } catch (err: any) {
      setFeedback(`❌ Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCategoryPhotoUpload = async (file: File) => {
    setUploadingCatImage(true);
    try {
      const sigRes = await fetch('/api/admin/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: 'muvera/categories',
          adminSecret: 'muvera_admin_master_secret_2026',
        }),
      });
      const sig = await sigRes.json();
      if (!sig.success) throw new Error(sig.error || 'Signature generation failed');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sig.apiKey);
      formData.append('timestamp', String(sig.timestamp));
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      setNewCatImage(uploadData.secure_url || uploadData.url);
    } catch (err: any) {
      alert(err.message || 'Category photo upload failed');
    } finally {
      setUploadingCatImage(false);
      if (catFileInputRef.current) catFileInputRef.current.value = '';
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          image: newCatImage,
          description: newCatDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create category');

      setFeedback(`✅ Category "${data.category.name}" added successfully!`);
      setTimeout(() => setFeedback(''), 4000);
      setCategory(data.category.name);
      setNewCatName('');
      setNewCatImage('');
      setNewCatDescription('');
      setIsCatModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    } finally {
      setSavingCat(false);
    }
  };

  // Auto-generate suggested SKU Prefix when title changes
  const handleTitleChange = (val: string) => {
    setTitle(val);
    const words = val.trim().split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const suggested = words.map(w => w.slice(0, 3).toUpperCase()).join('-').slice(0, 10);
      setSkuPrefix(prev => (prev === '' || prev.length <= 4 ? suggested : prev));
    }
  };

  /** Upload multiple selected files directly to Cloudinary */
  const handleImagesUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadCount(fileArray.length);
    setUploadError('');

    try {
      // 1. Get upload signature from server
      const sigRes = await fetch('/api/admin/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: 'muvera/products',
          adminSecret: 'muvera_admin_master_secret_2026',
        }),
      });
      const sig = await sigRes.json();
      if (!sig.success) throw new Error(sig.error || 'Signature generation failed');

      // 2. Upload all selected files concurrently
      const uploadPromises = fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', sig.apiKey);
        formData.append('timestamp', String(sig.timestamp));
        formData.append('signature', sig.signature);
        formData.append('folder', sig.folder);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
          { method: 'POST', body: formData }
        );
        const uploadData = await uploadRes.json();
        if (uploadData.error) throw new Error(uploadData.error.message);
        return uploadData.secure_url as string;
      });

      const newUrls = await Promise.all(uploadPromises);
      setImageUrls((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Check Cloudinary credentials.');
    } finally {
      setUploading(false);
      setUploadCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    setImageUrls((prev) => {
      const target = prev[indexToPrimary];
      const rest = prev.filter((_, idx) => idx !== indexToPrimary);
      return [target, ...rest];
    });
  };

  const downloadSampleTemplate = async () => {
    const XLSX = await import('xlsx');
    const sampleData = [
      {
        title: 'Midnight Heavy French Terry Acid Wash Tee',
        category: 'T-Shirts',
        price: 2499,
        mrp: 4999,
        description: '450 GSM pure combed cotton, boxy dropped shoulder silhouette, distressed neck ribbing.',
        sku_prefix: 'ACID-TEE',
        stock_s: 10,
        stock_m: 15,
        stock_l: 20,
        stock_xl: 10,
        stock_xxl: 5,
        image_urls: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200, https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200',
        is_drop: true,
        fabric: '100% Super Combed French Terry Cotton (450 GSM)',
      },
      {
        title: 'Stealth Matte Nylon Technical Cargos',
        category: 'Pants',
        price: 3999,
        mrp: 6999,
        description: 'Water-repellent Japanese matte nylon streetwear cargos with magnetic buckle utility pockets.',
        sku_prefix: 'TECH-CARGO',
        stock_s: 8,
        stock_m: 12,
        stock_l: 12,
        stock_xl: 6,
        stock_xxl: 0,
        image_urls: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=1200',
        is_drop: false,
        fabric: 'Technical Matte Nylon & Ripstop Cordura',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    worksheet['!cols'] = [
      { wch: 40 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 45 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 60 },
      { wch: 10 },
      { wch: 35 },
    ];

    XLSX.writeFile(workbook, 'muvera_bulk_products_template.xlsx');
  };

  const handleBulkFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setBulkResult(null);

    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setBulkRows(data);
      } catch (err: any) {
        setUploadError('Failed to parse spreadsheet. Ensure it is a valid .xlsx or .csv file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkImportSubmit = async () => {
    if (bulkRows.length === 0) return;

    setBulkImporting(true);
    setBulkResult(null);

    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: bulkRows }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk import failed');

      setBulkResult(data);
      setFeedback(`Imported ${data.successCount} of ${data.total} products with SKUs and inventory!`);
      setTimeout(() => setFeedback(''), 5000);
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Bulk import failed');
    } finally {
      setBulkImporting(false);
    }
  };

  const handleBulkHelperPhotosUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploadingBulkHelper(true);
    try {
      const sigRes = await fetch('/api/admin/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: 'muvera/products',
          adminSecret: 'muvera_admin_master_secret_2026',
        }),
      });
      const sig = await sigRes.json();
      if (!sig.success) throw new Error(sig.error || 'Signature generation failed');

      const promises = fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', sig.apiKey);
        formData.append('timestamp', String(sig.timestamp));
        formData.append('signature', sig.signature);
        formData.append('folder', sig.folder);

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        return uploadData.secure_url as string;
      });

      const urls = await Promise.all(promises);
      setBulkHelperPhotos((prev) => [...prev, ...urls]);
    } catch (err: any) {
      alert(err.message || 'Image upload failed');
    } finally {
      setUploadingBulkHelper(false);
      if (bulkHelperPhotosRef.current) bulkHelperPhotosRef.current.value = '';
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (imageUrls.length === 0) {
      alert('Please upload at least one product photo!');
      return;
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const selectedSizes = Object.entries(sizeConfig)
      .filter(([_, cfg]) => cfg.enabled)
      .map(([sz, cfg]) => ({ size: sz as SizeOption, stock: cfg.stock }));

    if (selectedSizes.length === 0) {
      alert('Please enable at least one size variant!');
      return;
    }

    const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const basePrefix = skuPrefix.trim() ? skuPrefix.trim().toUpperCase() : title.slice(0, 3).toUpperCase();
    const variants: Variant[] = selectedSizes.map(({ size, stock }) => ({
      id: `var_${basePrefix.toLowerCase()}_${size.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      sku: `${basePrefix}-${size}-${randomSuffix}`,
      size,
      color: 'Obsidian Black',
      colorHex: '#0E0E10',
      pricePaise: sellingPrice * 100,
      mrpPaise: mrp * 100,
      initialStock: stock,
    } as any));

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      title,
      slug,
      brand,
      brandSlug,
      category,
      categorySlug,
      description,
      mrpPaise: mrp * 100,
      sellingPricePaise: sellingPrice * 100,
      discountPercentage: Math.round(((mrp - sellingPrice) / mrp) * 100),
      images: imageUrls.map((url, order) => ({
        url,
        alt: `${title} - View ${order + 1}`,
        order,
      })),
      variants,
      rating: 5.0,
      reviewCount: 1,
      tags: ['New Release', brand],
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProd),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      setFeedback(`✅ Product "${title}" created with ${imageUrls.length} photos & ${variants.length} SKUs!`);
      setTimeout(() => setFeedback(''), 4000);
      setIsModalOpen(false);
      loadProducts();

      // Reset
      setTitle('');
      setDescription('');
      setImageUrls([]);
      setUploadError('');
      setSkuPrefix('');
    } catch (err: any) {
      alert(`Error creating product: ${err.message}`);
    }
  };

  const filtered = products.filter((p) => {
    // 1. Keyword search (title, brand, slug, or SKU)
    const q = search.toLowerCase().trim();
    if (q) {
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchBrand = p.brand.toLowerCase().includes(q);
      const matchSlug = p.slug.toLowerCase().includes(q);
      const matchSku = p.variants?.some((v) => v.sku?.toLowerCase().includes(q));
      if (!matchTitle && !matchBrand && !matchSlug && !matchSku) return false;
    }

    // 2. Category Filter
    if (selectedCategoryFilter !== 'all') {
      const matchCategory =
        p.categorySlug === selectedCategoryFilter ||
        p.category?.toLowerCase() === selectedCategoryFilter.toLowerCase();
      if (!matchCategory) return false;
    }

    // 3. Stock Status Filter
    if (stockStatusFilter !== 'all') {
      const totalStock = p.variants?.reduce((sum, v) => sum + ((v as any).stock || (v as any).initialStock || 0), 0) || 0;
      if (stockStatusFilter === 'in_stock' && totalStock <= 0) return false;
      if (stockStatusFilter === 'out_of_stock' && totalStock > 0) return false;
    }

    return true;
  });

  const hasActiveCatalogFilters = search !== '' || selectedCategoryFilter !== 'all' || stockStatusFilter !== 'all';

  return (
    <div className="space-y-8">
      {/* Toast */}
      {feedback && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-500 text-surface-base px-4 py-2.5 rounded-full font-headline font-bold text-xs shadow-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">Product Catalog &amp; Variants</h1>
          <p className="text-xs text-text-muted mt-0.5">Manage products, custom categories, lookbooks &amp; live SKU inventory matrix</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsCatModalOpen(true)}
            variant="outline"
            size="sm"
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Add Category</span>
          </Button>
          <Button onClick={() => setIsBulkModalOpen(true)} variant="outline" size="sm" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import Excel / CSV</span>
          </Button>
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Button>
        </div>
      </div>

      {/* Search & Multi-Criteria Filter Bar */}
      <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by title, brand, or SKU..."
              className="w-full bg-surface-raised border border-surface-border rounded-xl pl-9 pr-8 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
            <Filter className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-text-muted hidden sm:inline">Category:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-surface-raised border border-surface-border rounded-xl px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary font-medium"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id || c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-text-muted hidden sm:inline">Stock:</span>
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="bg-surface-raised border border-surface-border rounded-xl px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary font-medium"
              >
                <option value="all">All Stock Status</option>
                <option value="in_stock">In Stock Only</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>

            {/* Active Filters Reset */}
            {hasActiveCatalogFilters && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategoryFilter('all');
                  setStockStatusFilter('all');
                }}
                className="text-[11px] font-bold text-primary hover:underline px-2 py-1"
              >
                Reset
              </button>
            )}

            {/* Count Badge */}
            <span className="text-[11px] font-mono text-text-muted bg-surface-raised px-2.5 py-1 rounded-lg border border-surface-border">
              {filtered.length} of {products.length} products
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Products Card List (Phones & Small Tablets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="col-span-full p-8 text-center text-text-muted bg-surface-card rounded-2xl border border-surface-border">
            No products match your search.
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-3 shadow-md hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-surface-raised flex-shrink-0 border border-surface-border">
                  <Image
                    src={p.images[0]?.url || 'https://res.cloudinary.com/ha2fbiwt/image/upload/v1/muvera/products/placeholder'}
                    alt={p.title}
                    fill
                    className="object-cover"
                  />
                  {p.images && p.images.length > 1 && (
                    <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] font-bold px-1 rounded-tl text-white">
                      {p.images.length}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase text-primary tracking-wider">{p.brand}</p>
                  <h3 className="font-headline font-bold text-text-primary text-xs line-clamp-2 leading-tight">
                    {p.title}
                  </h3>
                  <p className="text-[10px] text-text-muted font-mono truncate mt-0.5">{p.slug}</p>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="font-mono font-bold text-xs text-text-primary">
                      {formatPaise(p.sellingPricePaise)}
                    </span>
                    <span className="text-[10px] text-text-muted line-through font-mono">
                      {formatPaise(p.mrpPaise)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Variant SKUs */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-text-muted font-bold mr-1">Sizes:</span>
                {p.variants.map((v) => (
                  <span
                    key={v.sku}
                    className="font-mono text-[9px] font-bold bg-surface-raised px-1.5 py-0.5 rounded border border-surface-border text-text-surface"
                  >
                    {v.size}
                  </span>
                ))}
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-border">
                <Link
                  href={`/product/${p.slug}`}
                  className="flex-1 text-center py-2 px-2.5 rounded-xl border border-surface-border text-primary hover:bg-primary/10 transition-colors text-xs font-bold inline-flex items-center justify-center gap-1"
                  target="_blank"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Live</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(p)}
                  className="flex-1 text-center py-2 px-2.5 rounded-xl border border-surface-border bg-surface-raised text-text-primary hover:border-primary hover:text-primary transition-colors text-xs font-bold inline-flex items-center justify-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingProduct(p)}
                  className="p-2 rounded-xl border border-surface-border text-text-muted hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Product"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Products Table (hidden on mobile) */}
      <div className="hidden md:block rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-surface-border text-text-muted font-bold uppercase tracking-wider bg-surface-raised/50">
                <th className="p-4">Product</th>
                <th className="p-4">Brand</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4 text-center">Variants &amp; SKUs</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-12 rounded-lg overflow-hidden bg-surface-raised flex-shrink-0">
                        <Image src={p.images[0]?.url || 'https://res.cloudinary.com/ha2fbiwt/image/upload/v1/muvera/products/placeholder'} alt={p.title} fill className="object-cover" />
                        {p.images && p.images.length > 1 && (
                          <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] font-bold px-1 rounded-tl text-white">
                            {p.images.length}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-headline font-bold text-text-primary text-xs">{p.title}</p>
                        <p className="text-[11px] text-text-muted font-mono">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-text-surface">{p.brand}</td>
                  <td className="p-4 text-text-muted">{p.category}</td>
                  <td className="p-4 font-mono font-bold text-text-primary">
                    {formatPaise(p.sellingPricePaise)}
                    <span className="text-[11px] text-text-muted line-through ml-1.5 font-normal">
                      {formatPaise(p.mrpPaise)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1 max-w-[14rem] mx-auto">
                      {p.variants.map((v) => (
                        <span key={v.sku} className="font-mono text-[10px] font-bold bg-surface-raised px-1.5 py-0.5 rounded border border-surface-border whitespace-nowrap inline-flex items-center" title={`${v.size}: ${v.sku}`}>
                          {v.sku}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/product/${p.slug}`}
                        className="p-1.5 rounded-lg border border-surface-border text-primary hover:bg-primary/10 transition-colors inline-flex items-center gap-1 text-xs font-bold"
                        target="_blank"
                        title="View Live Product Page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Live</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg border border-surface-border text-text-primary hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-1 text-xs font-bold"
                        title="Edit Product"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingProduct(p)}
                        className="p-1.5 rounded-lg border border-surface-border text-text-muted hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-colors inline-flex items-center gap-1 text-xs font-bold"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-surface-border">
              <h3 className="font-headline font-bold text-base text-text-primary">Add New Fashion Product</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-text-muted mb-1 block">Product Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Nocturne Heavyweight Satin Bomber"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Brand *</label>
                  <select value={brand} onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary">
                    {siteConfig.brands.map((b) => <option key={b.slug} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-text-muted block">Category *</label>
                    <button
                      type="button"
                      onClick={() => setIsCatModalOpen(true)}
                      className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Category</span>
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setIsCatModalOpen(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary focus:border-primary focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id || c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__add_new__" className="text-primary font-bold">
                      + Add New Category...
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">MRP (₹) *</label>
                  <input type="number" required value={mrp} onChange={(e) => setMrp(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono" />
                </div>
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Selling Price (₹) *</label>
                  <input type="number" required value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono" />
                </div>
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Description *</label>
                <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fabric composition, silhouette, styling notes..."
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary" />
              </div>

              {/* Multi-Photo Cloudinary Upload Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-text-muted flex items-center gap-1.5">
                    <Images className="w-3.5 h-3.5 text-primary" />
                    <span>Product Photos (Upload Multiple) *</span>
                  </label>
                  <span className="text-[10px] text-text-muted">
                    {imageUrls.length} {imageUrls.length === 1 ? 'photo' : 'photos'} added
                  </span>
                </div>

                {/* Uploaded Photos Grid */}
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-surface-raised border border-surface-border">
                    {imageUrls.map((url, idx) => (
                      <div
                        key={url}
                        className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-card border-2 group transition-all ${
                          idx === 0 ? 'border-primary shadow-gold-glow' : 'border-surface-border'
                        }`}
                      >
                        <Image src={url} alt={`Upload ${idx + 1}`} fill className="object-cover" />

                        {/* Primary Badge */}
                        <div className="absolute top-1.5 left-1.5 z-10">
                          {idx === 0 ? (
                            <span className="bg-primary text-surface-base text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow">
                              Cover
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              title="Set as Main Cover Photo"
                              className="bg-black/70 hover:bg-primary hover:text-surface-base text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm transition-colors opacity-80 group-hover:opacity-100 flex items-center gap-0.5"
                            >
                              <Star className="w-2.5 h-2.5 fill-current" /> Set Cover
                            </button>
                          )}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          title="Remove photo"
                          className="absolute top-1.5 right-1.5 z-10 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-1 transition-all opacity-80 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>

                        <div className="absolute bottom-1 right-1.5 text-[9px] font-mono text-white/80 bg-black/60 px-1 rounded">
                          #{idx + 1}
                        </div>
                      </div>
                    ))}

                    {/* Add More Photos compact button */}
                    <div
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className="aspect-[3/4] rounded-xl border-2 border-dashed border-surface-border hover:border-primary bg-surface-card hover:bg-surface-raised flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-text-muted p-2 text-center"
                    >
                      <Plus className="w-5 h-5 text-primary" />
                      <span className="text-[10px] font-bold">Add More</span>
                    </div>
                  </div>
                )}

                {/* Initial Empty Upload Dropzone */}
                {imageUrls.length === 0 && (
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`w-full h-36 rounded-2xl border-2 border-dashed border-surface-border bg-surface-raised hover:border-primary transition-all flex flex-col items-center justify-center gap-2 text-text-muted p-4 text-center ${
                      uploading ? 'cursor-wait' : 'cursor-pointer hover:bg-surface-raised/80'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-text-primary">
                          Uploading {uploadCount} {uploadCount === 1 ? 'photo' : 'photos'} to Cloudinary...
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-primary" />
                        <div>
                          <p className="text-xs font-bold text-text-primary">Click to select product photos</p>
                          <p className="text-[11px] text-text-muted mt-0.5">Select multiple photos at once (Front, Back, Detail, Flat Lay)</p>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted bg-surface-card px-2 py-0.5 rounded border border-surface-border">
                          JPG, PNG, WEBP · Max 10MB per image
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Hidden multiple file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImagesUpload(e.target.files);
                    }
                  }}
                />

                {uploadError && (
                  <p className="text-red-400 text-[11px] mt-1.5 flex items-center gap-1">
                    <X className="w-3 h-3 flex-shrink-0" /> {uploadError}
                  </p>
                )}
              </div>

              {/* SKU Base Code & Per-Size Stock Matrix */}
              <div className="space-y-3 p-4 rounded-2xl bg-surface-raised border border-surface-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-text-primary block">SKU Base Code / Prefix *</label>
                    <p className="text-[11px] text-text-muted">
                      Unique prefix for this product&apos;s variants (e.g. <span className="font-mono text-primary font-bold">{(skuPrefix || 'NOC-BOM')}-S</span>, <span className="font-mono text-primary font-bold">{(skuPrefix || 'NOC-BOM')}-M</span>)
                    </p>
                  </div>
                  <input
                    type="text"
                    required
                    value={skuPrefix}
                    onChange={(e) => setSkuPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="e.g. NOC-BOM"
                    className="bg-surface-card border border-surface-border rounded-xl px-3 py-1.5 text-xs text-text-primary font-mono font-bold max-w-[10rem] focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-2 border-t border-surface-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-text-muted">Select Sizes &amp; Initial Stock Units</label>
                    <span className="text-[10px] text-text-muted">Each size gets a distinct SKU &amp; inventory count</span>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(sizeConfig).map(([sz, cfg]) => {
                      const fullSku = `${(skuPrefix || 'SKU')}-${sz}`;
                      return (
                        <div
                          key={sz}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            cfg.enabled
                              ? 'bg-surface-card border-surface-border shadow-sm'
                              : 'bg-surface-card/40 border-transparent opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`sz-${sz}`}
                              checked={cfg.enabled}
                              onChange={(e) =>
                                setSizeConfig((prev) => ({
                                  ...prev,
                                  [sz]: { ...prev[sz], enabled: e.target.checked },
                                }))
                              }
                              className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                            />
                            <label htmlFor={`sz-${sz}`} className="font-black text-xs px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 cursor-pointer">
                              Size {sz}
                            </label>
                            <span className="font-mono text-[11px] text-text-muted">
                              SKU: <strong className="text-text-primary tracking-wide">{fullSku}</strong>
                            </span>
                          </div>

                          {cfg.enabled && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-text-muted font-bold">Initial Stock:</span>
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                value={cfg.stock}
                                onChange={(e) =>
                                  setSizeConfig((prev) => ({
                                    ...prev,
                                    [sz]: { ...prev[sz], stock: Math.max(0, Number(e.target.value)) },
                                  }))
                                }
                                className="w-16 bg-surface-raised border border-surface-border rounded-lg px-2 py-1 text-center font-mono font-bold text-xs text-text-primary focus:outline-none focus:border-primary"
                              />
                              <span className="text-[10px] text-text-muted">units</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" size="sm" fullWidth>Cancel</Button>
                <Button type="submit" size="sm" fullWidth disabled={uploading || imageUrls.length === 0}>
                  {uploading ? `Uploading ${uploadCount} Photos...` : 'Save Product & SKUs'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Bulk Catalog Ingestion</span>
                </div>
                <h2 className="font-headline font-black text-xl text-text-primary mt-1">
                  Import Products via Excel / CSV
                </h2>
                <p className="text-xs text-text-muted">
                  Batch upload catalog items with per-size stock counts (`S`, `M`, `L`, `XL`, `XXL`) and multi-photo lookbooks
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkRows([]);
                  setBulkFileName('');
                  setBulkResult(null);
                }}
                className="w-8 h-8 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Step 1: Download Template & Instructions */}
              <div className="p-4 rounded-xl bg-surface-raised border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-text-primary text-sm">Need the spreadsheet template?</p>
                  <p className="text-text-muted mt-0.5">
                    Download our pre-formatted template with sample products, size columns, and image formats.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex-shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Sample (.xlsx)</span>
                </button>
              </div>

              {/* Step 2: Cloudinary Multi-Photo Helper (Answers user: "with count images what we can do?") */}
              <div className="p-4 rounded-xl bg-surface-raised/60 border border-surface-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-primary font-bold">
                      <Images className="w-4 h-4" />
                      <span>Batch Image Uploader Helper</span>
                    </div>
                    <p className="text-text-muted text-[11px] mt-0.5">
                      Upload multiple product photos directly to Cloudinary here, then copy their URLs to paste into your Excel file.
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={bulkHelperPhotosRef}
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleBulkHelperPhotosUpload(e.target.files)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingBulkHelper}
                      onClick={() => bulkHelperPhotosRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      <span>{uploadingBulkHelper ? 'Uploading to Cloudinary...' : 'Upload Photos'}</span>
                    </Button>
                  </div>
                </div>

                {bulkHelperPhotos.length > 0 && (
                  <div className="p-3 bg-surface-card rounded-xl border border-surface-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary text-[11px]">
                        Uploaded Cloudinary Assets ({bulkHelperPhotos.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(bulkHelperPhotos.join(', '));
                          setCopiedUrl('all');
                          setTimeout(() => setCopiedUrl(null), 2000);
                        }}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        {copiedUrl === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl === 'all' ? 'Copied All URLs!' : 'Copy All URLs (comma-separated)'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                      {bulkHelperPhotos.map((url, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-surface-border bg-black/40 p-1 flex items-center justify-between">
                          <img src={url} alt={`Upload ${idx + 1}`} className="w-8 h-8 rounded object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(url);
                              setCopiedUrl(url);
                              setTimeout(() => setCopiedUrl(null), 2000);
                            }}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-surface-raised hover:bg-surface-border text-text-muted hover:text-text-primary flex items-center gap-1"
                          >
                            {copiedUrl === url ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedUrl === url ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: File Drop / Selection */}
              <div>
                <label className="font-bold text-text-muted uppercase tracking-wider block mb-2">
                  Select Excel or CSV File
                </label>
                <input
                  type="file"
                  ref={bulkFileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleBulkFileSelect}
                  className="hidden"
                />

                <div
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="border-2 border-dashed border-surface-border hover:border-primary/50 rounded-2xl p-8 text-center cursor-pointer transition-all bg-surface-raised/40 hover:bg-surface-raised space-y-2"
                >
                  <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto opacity-75" />
                  <div>
                    <p className="font-bold text-text-primary text-sm">
                      {bulkFileName ? `Selected: ${bulkFileName}` : 'Click to browse or drop .xlsx / .csv spreadsheet'}
                    </p>
                    <p className="text-text-muted text-[11px] mt-0.5">
                      Supports Excel 2007+ (.xlsx), older Excel (.xls), and standard CSV formats
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4: Parsed Data Preview Table */}
              {bulkRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">
                      Parsed Products ({bulkRows.length} items ready for import):
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Brand automatically set to <strong>MUVERA</strong>
                    </span>
                  </div>

                  <div className="rounded-xl border border-surface-border overflow-hidden max-h-56 overflow-y-auto bg-surface-base">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="bg-surface-raised text-text-muted border-b border-surface-border font-bold">
                          <th className="p-2.5">Title</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Price</th>
                          <th className="p-2.5">SKU Prefix</th>
                          <th className="p-2.5 text-center">Stock S/M/L/XL/XXL</th>
                          <th className="p-2.5">Images</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {bulkRows.map((row, idx) => {
                          const title = row.title || row.Title || 'Untitled';
                          const cat = row.category || row.Category || 'Streetwear';
                          const price = row.price || row.Price || 0;
                          const skuPfx = (row.sku_prefix || row.SKUPrefix || title.slice(0, 3)).toUpperCase();
                          const s = row.stock_s ?? row.Stock_S ?? 10;
                          const m = row.stock_m ?? row.Stock_M ?? 15;
                          const l = row.stock_l ?? row.Stock_L ?? 20;
                          const xl = row.stock_xl ?? row.Stock_XL ?? 10;
                          const xxl = row.stock_xxl ?? row.Stock_XXL ?? 5;
                          const totalStock = Number(s) + Number(m) + Number(l) + Number(xl) + Number(xxl);

                          return (
                            <tr key={idx} className="hover:bg-surface-card/60">
                              <td className="p-2.5 font-bold text-text-primary">{title}</td>
                              <td className="p-2.5 text-text-muted">{cat}</td>
                              <td className="p-2.5 font-mono text-primary font-bold">₹{price}</td>
                              <td className="p-2.5 font-mono text-text-muted">{skuPfx}</td>
                              <td className="p-2.5 text-center font-mono">
                                <span className="text-text-primary font-bold">{totalStock} units</span>
                                <span className="text-[9px] text-text-muted ml-1">({s}/{m}/{l}/{xl}/{xxl})</span>
                              </td>
                              <td className="p-2.5 text-text-muted">
                                {row.image_urls ? (
                                  <span className="text-emerald-400 font-bold">Custom Lookbook</span>
                                ) : (
                                  <span className="text-amber-400">Default Luxury Fallback</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Result Summary */}
              {bulkResult && (
                <div className={`p-4 rounded-xl border space-y-1 ${
                  bulkResult.failureCount === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  <p className="font-bold text-sm">
                    {bulkResult.failureCount === 0 ? '✓ Import Successful' : 'Import Partially Completed'}
                  </p>
                  <p className="text-xs text-text-muted">
                    Successfully imported <strong>{bulkResult.successCount}</strong> of <strong>{bulkResult.total}</strong> products with variant SKUs and live inventory to MongoDB Atlas.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-surface-border bg-surface-raised flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkRows([]);
                  setBulkFileName('');
                  setBulkResult(null);
                }}
              >
                Close
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={bulkRows.length === 0 || bulkImporting}
                onClick={handleBulkImportSubmit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {bulkImporting
                  ? 'Importing into Atlas...'
                  : `Confirm & Import ${bulkRows.length} Products`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-surface-border">
              <div>
                <h3 className="font-headline font-bold text-base text-text-primary flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  <span>Edit Product</span>
                </h3>
                <p className="text-[11px] font-mono text-text-muted mt-0.5">
                  ID: {editingProduct.id} • Slug: {editingProduct.slug}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="font-bold text-text-muted mb-1 block">Product Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary focus:border-primary focus:outline-none font-medium"
                />
              </div>

              {/* Brand & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Brand *</label>
                  <select
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary focus:border-primary focus:outline-none"
                  >
                    {siteConfig.brands.map((b) => (
                      <option key={b.slug} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-text-muted block">Category *</label>
                    <button
                      type="button"
                      onClick={() => setIsCatModalOpen(true)}
                      className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Category</span>
                    </button>
                  </div>
                  <select
                    value={editCategory}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setIsCatModalOpen(true);
                      } else {
                        setEditCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary focus:border-primary focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id || c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__add_new__" className="text-primary font-bold">
                      + Add New Category...
                    </option>
                  </select>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-raised/40 p-3 rounded-xl border border-surface-border">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editMrp}
                    onChange={(e) => setEditMrp(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono focus:border-primary focus:outline-none"
                  />
                  {editMrp > editSellingPrice && (
                    <span className="text-[10px] text-emerald-400 font-bold mt-1 inline-block">
                      {Math.round(((editMrp - editSellingPrice) / editMrp) * 100)}% Discount applied
                    </span>
                  )}
                </div>
              </div>

              {/* Badges / Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 bg-surface-raised/50 border border-surface-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={editIsBlitzDrop}
                    onChange={(e) => setEditIsBlitzDrop(e.target.checked)}
                    className="rounded border-surface-border text-primary focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-text-primary block text-xs">⚡ Blitz Drop</span>
                    <span className="text-[10px] text-text-muted">Feature prominently as limited blitz release</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 bg-surface-raised/50 border border-surface-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={editIsDealOfTheHour}
                    onChange={(e) => setEditIsDealOfTheHour(e.target.checked)}
                    className="rounded border-surface-border text-primary focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-text-primary block text-xs">🔥 Deal of the Hour</span>
                    <span className="text-[10px] text-text-muted">Showcase in hourly flash sale highlight</span>
                  </div>
                </label>
              </div>

              {/* Description & Fabric */}
              <div>
                <label className="font-bold text-text-muted mb-1 block">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Fabric &amp; Care Details</label>
                <input
                  type="text"
                  value={editFabricDetails}
                  onChange={(e) => setEditFabricDetails(e.target.value)}
                  placeholder="e.g. 260 GSM 100% Combed French Terry Cotton • Cold Machine Wash"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              {/* Product Photos */}
              <div className="space-y-2 pt-2 border-t border-surface-border">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-text-muted flex items-center gap-1.5">
                    <Images className="w-3.5 h-3.5 text-primary" />
                    <span>Product Lookbook Images ({editImages.length})</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files && handleEditImagesUpload(e.target.files)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingEditImages}
                      onClick={() => editFileInputRef.current?.click()}
                      className="h-7 text-[11px] gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{uploadingEditImages ? 'Uploading...' : 'Upload Photos'}</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {editImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-raised border border-surface-border group"
                    >
                      <Image src={img.url} alt={`Photo ${idx + 1}`} fill className="object-cover" />
                      <div className="absolute top-1 left-1 bg-black/70 text-[9px] font-bold px-1.5 py-0.5 rounded text-white font-mono">
                        #{idx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white p-1 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variants & Inventory */}
              <div className="space-y-2 pt-2 border-t border-surface-border">
                <label className="font-bold text-text-muted flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-primary" />
                  <span>Size Variants &amp; Live Stock</span>
                </label>
                <div className="space-y-2">
                  {editVariants.map((v, index) => (
                    <div
                      key={v.sku || index}
                      className="flex flex-wrap items-center gap-2 p-2.5 bg-surface-raised/40 border border-surface-border rounded-xl"
                    >
                      <span className="font-mono font-bold text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {v.size}
                      </span>
                      <span className="font-mono text-[11px] text-text-muted flex-1 min-w-[7.5rem]">
                        {v.sku}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-text-muted">Stock:</span>
                          <input
                            type="number"
                            min={0}
                            value={v.stock}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setEditVariants((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, stock: val } : item))
                              );
                            }}
                            className="w-16 bg-surface-raised border border-surface-border rounded-lg px-2 py-1 font-mono text-center text-xs text-text-primary"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-text-muted">Price ₹:</span>
                          <input
                            type="number"
                            min={1}
                            value={v.price}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 0);
                              setEditVariants((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, price: val } : item))
                              );
                            }}
                            className="w-20 bg-surface-raised border border-surface-border rounded-lg px-2 py-1 font-mono text-center text-xs text-text-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingEdit}
                  className="bg-primary text-black font-bold hover:bg-primary/90"
                >
                  {savingEdit ? 'Saving Changes...' : 'Save Product Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-base text-text-primary">Delete Product</h3>
                <p className="text-xs text-text-muted">This action is permanent and cannot be undone</p>
              </div>
            </div>

            <div className="p-3 bg-surface-raised border border-surface-border rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-surface-border">
                  <Image
                    src={deletingProduct.images[0]?.url || 'https://res.cloudinary.com/ha2fbiwt/image/upload/v1/muvera/products/placeholder'}
                    alt={deletingProduct.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-text-primary truncate">{deletingProduct.title}</p>
                  <p className="text-text-muted text-[11px]">{deletingProduct.brand} • {deletingProduct.category}</p>
                  <p className="font-mono text-[10px] text-text-muted truncate mt-0.5">{deletingProduct.slug}</p>
                </div>
              </div>
              <p className="text-text-muted text-[11px] pt-1 border-t border-surface-border/50">
                Deleting will remove this product and all associated SKU inventory records ({deletingProduct.variants.length} variants) from MongoDB Atlas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={() => setDeletingProduct(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-surface-border">
              <h3 className="font-headline font-bold text-base text-text-primary flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-primary" />
                <span>Add New Apparel Category</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-text-muted mb-1 block">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Acid-Wash Denims, Club Corsets, Varsity Jackets..."
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary focus:border-primary focus:outline-none"
                />
                {newCatName.trim() && (
                  <p className="text-[10px] font-mono text-text-muted mt-1">
                    Slug: {newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Category Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newCatDescription}
                  onChange={(e) => setNewCatDescription(e.target.value)}
                  placeholder="Editorial styling notes, silhouette description..."
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              {/* Category Cover Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-text-muted">Cover Photo (Optional)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={catFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleCategoryPhotoUpload(e.target.files[0])}
                    />
                    <button
                      type="button"
                      disabled={uploadingCatImage}
                      onClick={() => catFileInputRef.current?.click()}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-bold"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{uploadingCatImage ? 'Uploading...' : 'Upload Image'}</span>
                    </button>
                  </div>
                </div>

                <input
                  type="url"
                  value={newCatImage}
                  onChange={(e) => setNewCatImage(e.target.value)}
                  placeholder="https://... or upload image"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2 text-text-primary focus:border-primary focus:outline-none"
                />

                {newCatImage && (
                  <div className="relative w-full h-28 rounded-xl overflow-hidden bg-black border border-surface-border">
                    <Image src={newCatImage} alt="Category preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewCatImage('')}
                      className="absolute top-1 right-1 bg-black/80 hover:bg-black text-white p-1 rounded-full text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCatModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingCat || !newCatName.trim()}
                  className="bg-primary text-black font-bold hover:bg-primary/90"
                >
                  {savingCat ? 'Saving Category...' : 'Save Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
