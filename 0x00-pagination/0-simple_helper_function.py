#!/usr/bin/env python3
""" Range simple helper fun """
from typing import Tuple


def index_range(page: int, page_size: int) -> Tuple[int, int]:
    """
        Range of the page
        Args:
            page: Current page
            page_size: Total size of the page
        Return:
            tuple with the range start and end size page
    """

    final_size: int = page * page_size
    start_size: int = final_size - page_size

    return (start_size, final_size)
