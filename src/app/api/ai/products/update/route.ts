import { NextResponse } from 'next/server';
import { callMcpUpdateProductTool, getMcpUrl } from '@/services/mcpClient';

const USD_TO_INR_RATE = 85;

function parseAndConvertPriceRange(rawPriceRange?: string): {
  price: number;
  mrp: number;
  formattedPriceRange: string;
} {
  if (!rawPriceRange) {
    return { price: 40, mrp: 50, formattedPriceRange: '₹40 - ₹50' };
  }

  const isDollar = /\$|usd|dollar/i.test(rawPriceRange);
  const isExplicitRupee = /₹|rs\.?|inr/i.test(rawPriceRange);
  const nums = rawPriceRange.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];

  if (nums.length === 0) {
    return { price: 40, mrp: 50, formattedPriceRange: '₹40 - ₹50' };
  }

  let min = nums[0];
  let max = nums.length > 1 ? nums[1] : nums[0];

  if (max < min) {
    const temp = min;
    min = max;
    max = temp;
  }

  const isUsd = isDollar || (!isExplicitRupee && max <= 25 && (rawPriceRange.includes('.') || max <= 15));

  let inrPrice = isUsd ? Math.round(min * USD_TO_INR_RATE) : Math.round(min);
  let inrMrp = isUsd ? Math.round(max * USD_TO_INR_RATE) : Math.round(max);

  if (inrMrp <= inrPrice) {
    inrMrp = Math.round(inrPrice * 1.15) || inrPrice + 10;
  }

  if (inrPrice <= 0) inrPrice = 40;
  if (inrMrp <= inrPrice) inrMrp = inrPrice + 10;

  return {
    price: inrPrice,
    mrp: inrMrp,
    formattedPriceRange: `₹${inrPrice} - ₹${inrMrp}`,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_message, product_detail } = body;

    if (!user_message || !product_detail || !product_detail.product_name) {
      return NextResponse.json(
        {
          success: false,
          message: 'Both user_message and product_detail (with product_name) are required.',
        },
        { status: 400 }
      );
    }

    const mcpUrl = getMcpUrl();
    const updatedResult = await callMcpUpdateProductTool(user_message, {
      product_name: product_detail.product_name,
      category: product_detail.category || product_detail.category_name,
      description: product_detail.description,
      key_features: product_detail.key_features,
      price_range: product_detail.price_range,
    });

    if (!updatedResult) {
      return NextResponse.json(
        {
          success: false,
          message: 'MCP server did not return updated product details.',
        },
        { status: 502 }
      );
    }

    const { price, mrp, formattedPriceRange } = parseAndConvertPriceRange(updatedResult.price_range);

    return NextResponse.json({
      success: true,
      source: 'mcp-server-update',
      engine: 'update_product_detail_tool',
      server_url: mcpUrl,
      product: {
        name: updatedResult.product_name,
        category_name: updatedResult.category || product_detail.category || product_detail.category_name,
        description: updatedResult.description || product_detail.description,
        key_features: updatedResult.key_features && updatedResult.key_features.length > 0
          ? updatedResult.key_features
          : product_detail.key_features || [],
        price: price > 0 ? price : (product_detail.price || 40),
        mrp: mrp > 0 ? mrp : (product_detail.mrp || 50),
        price_range: formattedPriceRange,
        image_url: updatedResult.image_url || product_detail.image_url,
      },
      message: `Product "${updatedResult.product_name}" updated successfully via AI!`,
    });
  } catch (error: any) {
    console.error('Update Product API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to update product via MCP Server.',
      },
      { status: 500 }
    );
  }
}
