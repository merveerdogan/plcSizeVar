# ============================================================
# UNIVERSAL WITHIN-SUBJECT DASHBOARD | Block-Split Capable
# ============================================================

library(shiny)
library(tidyverse)
library(ggplot2)
library(DT)
library(bslib)
library(afex)
library(patchwork)

# ============================================================
# --- MAIN SETTINGS (Edit these for new experiments)
# ============================================================
DV <- "response"          # e.g. "RT"
IV <- "stiffnessLevel"    # e.g. "condition"
x_label <- "Actual Stiffness"            # label for IV (x-axis)
y_label <- "Perceived Stiffness"        # label for DV (y-axis)
# ============================================================
# --- STYLE SETTINGS ---
# ============================================================
plot_style <- list(
  axis_font_size = 15,
  font_family = "Charter",
  bar_color = "#005F73",
  border_color = "#dee2e6",
  border_width = 1.5,
  title_color = "#1b4965"
)

# ============================================================
# --- UI ---
# ============================================================
ui <- fluidPage(
  theme = bs_theme(
    version = 5,
    base_font = font_google("Libre Baskerville"),
    bootswatch = "flatly"
  ),
  
  titlePanel(div("PLC - Size Variant - Stiffness",
                 style = "font-weight:700;text-align:center;color:#1b4965;")),
  
  div(textOutput("version_info"),
      style = "text-align:center;color:gray;margin-top:-10px;margin-bottom:15px;"),
  
  sidebarLayout(
    sidebarPanel(
      h4("Controls", style = "color:#1b4965;font-weight:600;"),
      selectInput("version", "Select Data Version:",
                  choices = list.dirs("filtered", full.names = FALSE, recursive = FALSE),
                  selected = list.dirs("filtered", full.names = FALSE, recursive = FALSE)[1]),
      checkboxInput("split_blocks", "Block Separate", value = FALSE),
      hr(),
      downloadButton("download_raw", "⬇️ Download Raw Data"),
      width = 3
    ),
    
    mainPanel(
      tabsetPanel(
        tabPanel("Plotting Group Averages",
                 div(style="border:2px solid #dee2e6;border-radius:12px;
            padding:15px;margin-bottom:20px;
            box-shadow:1px 1px 6px rgba(0,0,0,0.08);",
                     h4("Mean Response by Condition",
                        style="text-align:center;color:#1b4965;"),
                     plotOutput("plot_actual", height="420px"),
                     div(style="text-align:center;margin-top:10px;",
                         downloadButton("download_svg", "⬇️ Download Vector (SVG)")
                     ),
                     hr(),
                     h5("Within-Subject ANOVA Results",
                        style="color:#1b4965;text-align:center;font-weight:600;"),
                     uiOutput("anova_actual")
                 )
        ),
        # --------------------------------------------------------
        tabPanel("Plotting Individul Averages",
                 div(style="border:2px solid #dee2e6;border-radius:12px;
             padding:15px;margin-bottom:20px;
             box-shadow:1px 1px 6px rgba(0,0,0,0.08);",
                     h4("Individual Observer",
                        style="text-align:center;color:#1b4965;"),
                     plotOutput("indiv_line_plot", height="550px"),
                     div(style="text-align:center;margin-top:10px;",
                         downloadButton("download_indiv_svg", "⬇️ Download Vector (SVG)")
                     )
                 )
        ),
        tabPanel("Individual-Level Summary",
                 div(style="border:2px solid #dee2e6;border-radius:12px;
                    padding:15px;margin:15px 0 5px 0;
                    box-shadow:1px 1px 6px rgba(0,0,0,0.08);",
                     DTOutput("summary_table"))
        ),
        # --------------------------------------------------------
        tabPanel("Raw Data",
                 div(style="border:2px solid #dee2e6;border-radius:12px;
             padding:15px;margin:15px 0 5px 0;
             box-shadow:1px 1px 6px rgba(0,0,0,0.08);",
                     h4("Full Raw Data (Selected Columns)",
                        style="text-align:center;color:#1b4965;"),
                     DTOutput("raw_table"))
        )
        
      )
    )
  )
)

# ============================================================
# --- SERVER ---
# ============================================================
server <- function(input, output, session) {
  
  # --- Info header
  output$version_info <- renderText({
    paste("Generated on:", format(Sys.Date(), "%b %d, %Y"))
  })
  
  # ============================================================
  # --- LOAD DATA + AUTO BLOCK ---
  # ============================================================
  data <- reactive({
    path <- file.path("filtered", input$version)
    files <- list.files(path, pattern="\\.csv$", full.names=TRUE)
    validate(need(length(files)>0, paste("⚠️ No CSV files in:", path)))
    
    df <- bind_rows(lapply(seq_along(files), function(i){
      tmp <- read.csv(files[i])
      tmp$participant <- i
      tmp
    }))
    
    validate(need(all(c(IV, DV, "trial_num") %in% names(df)),
                  paste0("Data must include '", IV, "', '", DV, "', and 'trial_num'.")))
    
    df <- df %>%
      group_by(participant) %>%
      mutate(Block = ifelse(trial_num <= median(trial_num, na.rm=TRUE),
                            "Block 1", "Block 2")) %>%
      ungroup()
    
    df
  })
  
  # ============================================================
  # --- Within-Subject Summary Function (Morey, 2008) ---
  # ============================================================
  ws_summary <- function(data, subj, within, dv){
    grand_mean <- mean(data[[dv]], na.rm=TRUE)
    normed <- data %>%
      group_by(!!sym(subj)) %>%
      mutate(sub_mean = mean(!!sym(dv), na.rm=TRUE),
             norm = (!!sym(dv)) - sub_mean + grand_mean) %>%
      ungroup()
    normed %>%
      group_by(!!sym(within)) %>%
      summarise(
        Mean = mean(norm, na.rm=TRUE),
        SE = sd(norm, na.rm=TRUE)/sqrt(n_distinct(!!sym(subj))),
        .groups="drop"
      )
  }
  
  # ============================================================
  # --- PLOT + ANOVA ---
  # ============================================================
  output$plot_actual <- renderPlot({
    df <- data()
    
    if (!input$split_blocks) {
      sm <- ws_summary(df, subj="participant", within=IV, dv=DV)
      ggplot(sm, aes(x=factor(!!sym(IV)), y=Mean)) +
        geom_col(fill=plot_style$bar_color, width=0.6, alpha=0.9) +
        geom_errorbar(aes(ymin=Mean-SE, ymax=Mean+SE), width=0.2) +
        geom_text(aes(label=sprintf("%.2f", Mean)), vjust=-0.6, size=4) +
        labs(x = x_label, y = y_label) +
        theme_minimal(base_size=plot_style$axis_font_size,
                      base_family=plot_style$font_family)
      
    } else {
      sm_block <- df %>%
        group_split(Block) %>%
        map_dfr(function(sub){
          tmp <- ws_summary(sub, subj="participant", within=IV, dv=DV)
          tmp$Block <- unique(sub$Block)
          tmp
        })
      
      max_y <- max(sm_block$Mean + sm_block$SE, na.rm=TRUE)
      
      p1 <- ggplot(filter(sm_block, Block=="Block 1"),
                   aes(x=factor(!!sym(IV)), y=Mean)) +
        geom_col(fill="#005F73", width=0.6, alpha=0.9) +
        geom_errorbar(aes(ymin=Mean-SE, ymax=Mean+SE), width=0.2) +
        geom_text(aes(label=sprintf("%.2f", Mean)), vjust=-0.6, size=3.8) +
        labs(title="Block 1", x=x_label, y=y_label) +
        coord_cartesian(ylim=c(0, max_y*1.05)) +
        theme_minimal(base_size=plot_style$axis_font_size,
                      base_family=plot_style$font_family)
      
      p2 <- ggplot(filter(sm_block, Block=="Block 2"),
                   aes(x=factor(!!sym(IV)), y=Mean)) +
        geom_col(fill="#0A9396", width=0.6, alpha=0.9) +
        geom_errorbar(aes(ymin=Mean-SE, ymax=Mean+SE), width=0.2) +
        geom_text(aes(label=sprintf("%.2f", Mean)), vjust=-0.6, size=3.8) +
        labs(title="Block 2", x=x_label, y=y_label) +
        coord_cartesian(ylim=c(0, max_y*1.05)) +
        theme_minimal(base_size=plot_style$axis_font_size,
                      base_family=plot_style$font_family)
      
      (p1 | p2)
    }
  })
  
  output$anova_actual <- renderUI({
    df <- data()
    
    # --- single-block (overall) case ---
    if (!input$split_blocks) {
      df_sub <- df %>%
        group_by(participant, !!sym(IV)) %>%
        summarise(mean_dv = mean(!!sym(DV), na.rm = TRUE), .groups = "drop")
      
      # dynamically build formula e.g. mean_dv ~ stiffnessLevel + Error(participant/stiffnessLevel)
      form <- as.formula(paste("mean_dv ~", IV, "+ Error(participant/", IV, ")"))
      
      aov_out <- suppressWarnings(
        aov_car(form, data = df_sub, anova_table = list(es = "pes"))
      )
      
      txt <- capture.output(print(aov_out))
      txt <- txt[!grepl("^Signif\\. codes", txt)]
      
      pre(paste(txt, collapse="\n"),
          style="white-space:pre;overflow-x:auto;word-wrap:normal;
           font-family:monospace;font-size:13px;line-height:1.25;
           background:#f8f9fa;padding:10px;border-radius:6px;
           border:1px solid #dee2e6;max-width:100%;")
      
    }
    
    # --- block-split case ---
    else {
      htmltools::div(
        style = "display:flex;justify-content:center;gap:25px;margin-top:10px;",
        lapply(c("Block 1", "Block 2"), function(b) {
          df_b <- df %>%
            filter(Block == b) %>%
            group_by(participant, !!sym(IV)) %>%
            summarise(mean_dv = mean(!!sym(DV), na.rm = TRUE), .groups = "drop")
          
          form <- as.formula(paste("mean_dv ~", IV, "+ Error(participant/", IV, ")"))
          
          aov_b <- suppressWarnings(
            aov_car(form, data = df_b, anova_table = list(es = "pes"))
          )
          
          txt <- capture.output(print(aov_b))
          txt <- txt[!grepl("^Signif\\. codes", txt)]
          
          htmltools::div(
            style = "flex:1;max-width:48%;background:#f8f9fa;
                   padding:10px 12px;border-radius:8px;
                   border:1px solid #dee2e6;
                   box-shadow:1px 1px 4px rgba(0,0,0,0.05);",
            pre(paste(txt, collapse="\n"),
                style="white-space:pre;overflow-x:auto;word-wrap:normal;
           font-family:monospace;font-size:13px;line-height:1.25;
           background:#f8f9fa;padding:10px;border-radius:6px;
           border:1px solid #dee2e6;max-width:100%;")
            
          )
        })
      )
    }
  })
  
  # ============================================================
  # --- INDIVIDUAL LINE PLOTS (each participant = 1 line)
  # ============================================================
  output$indiv_line_plot <- renderPlot({
    df <- data()
    
    # Compute mean per participant × condition (and × Block if enabled)
    if (!input$split_blocks) {
      df_sum <- df %>%
        group_by(participant, !!sym(IV)) %>%
        summarise(MeanDV = mean(!!sym(DV), na.rm = TRUE), .groups = "drop")
      
      ggplot(df_sum, aes(x = factor(!!sym(IV)), y = MeanDV,
                         group = participant, color = factor(participant))) +
        geom_line(linewidth = 0.8, alpha = 0.7) +
        geom_point(size = 2.2) +
        labs(x = x_label, y = y_label, color = "Participant") +
        theme_minimal(base_size = plot_style$axis_font_size,
                      base_family = plot_style$font_family) +
        theme(
          legend.position = "none",
          panel.grid.minor = element_blank(),
          plot.title = element_text(face = "bold", size = 16,
                                    color = plot_style$title_color)
        )
    } else {
      df_sum <- df %>%
        group_by(participant, Block, !!sym(IV)) %>%
        summarise(MeanDV = mean(!!sym(DV), na.rm = TRUE), .groups = "drop")
      
      ggplot(df_sum, aes(x = factor(!!sym(IV)), y = MeanDV,
                         group = participant, color = factor(participant))) +
        geom_line(linewidth = 0.8, alpha = 0.7) +
        geom_point(size = 2.2) +
        facet_wrap(~ Block, ncol = 2) +
        labs(x = x_label, y = y_label, color = "Participant") +
        theme_minimal(base_size = plot_style$axis_font_size,
                      base_family = plot_style$font_family) +
        theme(
          legend.position = "none",
          panel.grid.minor = element_blank(),
          plot.title = element_text(face = "bold", size = 16,
                                    color = plot_style$title_color)
        )
      
    }
  })
  
  # ============================================================
  # --- DOWNLOAD VECTOR-BASED PLOTS (SVG)
  # ============================================================
  output$download_svg <- downloadHandler(
    filename = function() {
      paste0("Plot_", input$version, "_", 
             ifelse(input$split_blocks, "BlockSplit", "Overall"), ".svg")
    },
    content = function(file) {
      df <- data()
      
      # helper for within-subject summary
      ws_summary <- function(data, subj, within, dv){
        grand_mean <- mean(data[[dv]], na.rm=TRUE)
        normed <- data %>%
          group_by(!!sym(subj)) %>%
          mutate(sub_mean = mean(!!sym(dv), na.rm=TRUE),
                 norm = (!!sym(dv)) - sub_mean + grand_mean) %>%
          ungroup()
        normed %>%
          group_by(!!sym(within)) %>%
          summarise(
            Mean = mean(norm, na.rm=TRUE),
            SE = sd(norm, na.rm=TRUE)/sqrt(n_distinct(!!sym(subj))),
            .groups="drop"
          )
      }
      
      # build plot (same logic as display)
      if (!input$split_blocks) {
        sm <- ws_summary(df, subj="participant", within=IV, dv=DV)
        p <- ggplot(sm, aes(x=factor(!!sym(IV)), y=Mean)) +
          geom_col(fill=plot_style$bar_color, width=0.6, alpha=0.9) +
          geom_errorbar(aes(ymin=Mean-SE, ymax=Mean+SE), width=0.2) +
          geom_text(aes(label=sprintf("%.2f", Mean)), vjust=-0.6, size=4) +
          labs(x=x_label, y=y_label) +
          theme_minimal(base_size=plot_style$axis_font_size,
                        base_family=plot_style$font_family)
      } else {
        sm_block <- df %>%
          group_split(Block) %>%
          map_dfr(function(sub){
            tmp <- ws_summary(sub, subj="participant", within=IV, dv=DV)
            tmp$Block <- unique(sub$Block)
            tmp
          })
        
        max_y <- max(sm_block$Mean + sm_block$SE, na.rm=TRUE)
        
        p1 <- ggplot(filter(sm_block, Block=="Block 1"),
                     aes(x=factor(!!sym(IV)), y=Mean)) +
          geom_col(fill="#005F73", width=0.6, alpha=0.9) +
          geom_errorbar(aes(ymin=Mean-SE, ymax=Mean+SE), width=0.2) +
          geom_text(aes(label=sprintf("%.2f", Mean)), vjust=-0.6, size=3.8) +
          labs(title="Block 1", x=x_label, y=y_label) +
          coord_cartesian(ylim=c(0, max_y*1.05)) +
          theme_minimal(base_size=plot_style$axis_font_size,
                        base_family=plot_style$font_family)
        
        p2 <- ggplot(filter(sm_block, Block=="Block 2"),
                     aes(x=factor(!!sym(IV)), y=Mean)) +
          geom_col(fill="#0A9396", width=0.6, alpha=0.9) +
          geom_errorbar(aes(ymin=Mean-SE, ymax=Mean+SE), width=0.2) +
          geom_text(aes(label=sprintf("%.2f", Mean)), vjust=-0.6, size=3.8) +
          labs(title="Block 2", x=x_label, y=y_label) +
          coord_cartesian(ylim=c(0, max_y*1.05)) +
          theme_minimal(base_size=plot_style$axis_font_size,
                        base_family=plot_style$font_family)
        
        p <- (p1 | p2)
      }
      
      # --- save as SVG vector ---
      ggsave(file, plot = p, device = "svg", width = 9, height = 5.5)
    }
  )
  
  # ============================================================
  # --- DOWNLOAD INDIVIDUAL LINE PLOT (SVG)
  # ============================================================
  output$download_indiv_svg <- downloadHandler(
    filename = function() {
      paste0("Individual_Plot_", input$version, "_",
             ifelse(input$split_blocks, "BlockSplit", "Overall"), ".svg")
    },
    content = function(file) {
      df <- data()
      
      if (!input$split_blocks) {
        df_sum <- df %>%
          group_by(participant, !!sym(IV)) %>%
          summarise(MeanDV = mean(!!sym(DV), na.rm = TRUE), .groups = "drop")
        
        p <- ggplot(df_sum, aes(x = factor(!!sym(IV)), y = MeanDV,
                                group = participant, color = factor(participant))) +
          geom_line(linewidth = 0.8, alpha = 0.7) +
          geom_point(size = 2.2) +
          labs(x = x_label, y = y_label, color = "Participant") +
          theme_minimal(base_size = plot_style$axis_font_size,
                        base_family = plot_style$font_family) +
          theme(
            legend.position = "none",
            panel.grid.minor = element_blank(),
            plot.title = element_text(face = "bold", size = 16,
                                      color = plot_style$title_color)
          )
      } else {
        df_sum <- df %>%
          group_by(participant, Block, !!sym(IV)) %>%
          summarise(MeanDV = mean(!!sym(DV), na.rm = TRUE), .groups = "drop")
        
        p <- ggplot(df_sum, aes(x = factor(!!sym(IV)), y = MeanDV,
                                group = participant, color = factor(participant))) +
          geom_line(linewidth = 0.8, alpha = 0.7) +
          geom_point(size = 2.2) +
          facet_wrap(~ Block, ncol = 2) +
          labs(x = x_label, y = y_label, color = "Participant") +
          theme_minimal(base_size = plot_style$axis_font_size,
                        base_family = plot_style$font_family) +
          theme(
            legend.position = "none",
            panel.grid.minor = element_blank(),
            plot.title = element_text(face = "bold", size = 16,
                                      color = plot_style$title_color)
          )
      }
      
      ggsave(file, plot = p, device = "svg", width = 9, height = 6)
    }
  )
  
  # ============================================================
  # --- INDIVIDUAL-LEVEL SUMMARY TABLE
  # ============================================================
  output$summary_table <- renderDT({
    df <- data()
    
    # --- columns to attach if present in data ---
    extra_cols <- c(
      "frame_duration_ms_avg",
      "min_size_px_actualized",
      "max_size_px_actualized",
      "avg_size_px_actualized",
      "first_frame_height_px",
      "first_frame_width_px",
      "display_duration_s"
    )
    
    # --- summarise by participant and optionally by block ---
    if (!input$split_blocks) {
      df_sum <- df %>%
        group_by(participant, !!sym(IV)) %>%
        summarise(
          MeanDV = mean(!!sym(DV), na.rm = TRUE),
          SD = sd(!!sym(DV), na.rm = TRUE),
          N = n(),
          across(all_of(extra_cols), ~ mean(.x, na.rm = TRUE)),
          .groups = "drop"
        )
    } else {
      df_sum <- df %>%
        group_by(participant, Block, !!sym(IV)) %>%
        summarise(
          MeanDV = mean(!!sym(DV), na.rm = TRUE),
          SD = sd(!!sym(DV), na.rm = TRUE),
          N = n(),
          across(all_of(extra_cols), ~ mean(.x, na.rm = TRUE)),
          .groups = "drop"
        )
    }
    
    # --- keep only columns that actually exist ---
    keep_cols <- intersect(
      c("participant", "Block", IV, "MeanDV", "SD", "N", extra_cols),
      names(df_sum)
    )
    df_sum <- df_sum[, keep_cols, drop = FALSE]
    
    # --- round numeric values to 2 decimals ---
    df_sum <- df_sum %>%
      mutate(across(where(is.numeric), ~ round(., 2)))
    
    # --- compact, minimal DataTable ---
    datatable(
      df_sum,
      options = list(
        pageLength = 15,
        scrollX = TRUE,
        autoWidth = TRUE,
        columnDefs = list(list(className = 'dt-center', targets = "_all")),
        initComplete = JS(
          "function(settings, json) {",
          "  this.api().columns().every(function() {",
          "    var column = this;",
          "    $(column.header()).css('white-space', 'nowrap');",
          "  });",
          "}"
        )
      ),
      rownames = FALSE,
      class = "compact stripe hover",
      caption = htmltools::tags$caption(
        style = "caption-side: top; text-align: center; font-weight: bold;
               color: #1b4965; padding-bottom: 5px;",
        if (input$split_blocks)
          paste("Individual-level averages by participant × Block ×", IV)
        else
          paste("Individual-level averages by participant ×", IV)
      )
    ) %>%
      formatStyle(
        columns = names(df_sum),
        'white-space' = 'nowrap',
        'padding-right' = '6px',
        'padding-left' = '6px'
      )
  })
  
  # ============================================================
  # --- RAW DATA TABLE (subset of selected columns, compact layout)
  # ============================================================
  output$raw_table <- renderDT({
    df <- data()
    
    # --- list of additional columns ---
    extra_cols <- c(
      "clothType", "frame_duration_ms_set", "frame_duration_ms_min",
      "frame_duration_ms_max", "frame_duration_ms_avg",
      "min_size_px_set", "max_size_px_set", "min_size_px_actualized",
      "max_size_px_actualized", "avg_size_px_actualized",
      "scaling_factor_set", "pixels_per_degree_set",
      "first_frame_height_px", "first_frame_width_px",
      "display_duration_s", "dot_count", "dot_radius_px",
      "screen_height", "screen_width", "speed_rate",
      "planned_final_speed", "cloth_original_speed",
      "gender", "age", "attentionScore"
    )
    
    # --- keep only columns that exist ---
    keep_cols <- intersect(
      c("participant", "Block", IV, DV, extra_cols),
      names(df)
    )
    
    df_filtered <- df[, keep_cols, drop = FALSE]
    
    # --- round numeric columns (if appropriate) ---
    df_filtered <- df_filtered %>%
      mutate(across(where(is.numeric), ~ round(., 2)))
    
    # --- compact Datatable ---
    datatable(
      df_filtered,
      options = list(
        pageLength = 15,
        scrollX = TRUE,
        autoWidth = TRUE,
        columnDefs = list(list(className = 'dt-center', targets = "_all")),
        initComplete = JS(
          "function(settings, json) {",
          "  this.api().columns().every(function() {",
          "    var column = this;",
          "    $(column.header()).css('white-space', 'nowrap');",
          "  });",
          "}"
        )
      ),
      rownames = FALSE,
      class = "compact stripe hover",
      caption = htmltools::tags$caption(
        style = "caption-side: top; text-align: center; font-weight: bold;
               color: #1b4965; padding-bottom: 5px;",
        "Raw data with selected display, stimulus, and participant-level variables"
      )
    ) %>%
      formatStyle(
        columns = names(df_filtered),
        'white-space' = 'nowrap',
        'padding-right' = '6px',
        'padding-left' = '6px'
      )
  })
  
  # ============================================================
  # --- DOWNLOAD ---
  # ============================================================
  output$download_raw <- downloadHandler(
    filename=function() paste0("RawData_", input$version, ".csv"),
    content=function(file) write.csv(data(), file, row.names=FALSE)
  )
}

# ============================================================
# --- RUN APP ---
# ============================================================
shinyApp(ui, server)
